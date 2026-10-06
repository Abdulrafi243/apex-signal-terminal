from __future__ import annotations
import asyncio
from app.analysis.smc import analyze_smc
from app.analysis.trade_setup import trade_levels, dynamic_trade_levels, assess_entry_actionability, trade_plan_sanity
from app.analysis.context import ote_zone
from app.analysis.multitimeframe import higher_timeframes, summarize
from app.analysis.decision_engine import decide_current_action
from app.models.signal import SignalResponse
from app.services.data_router import data_router
from app.services.news import news_risk
from app.services.storage import storage
from app.services.notification_service import notifications
from app.services.data_health import data_health
from app.core.config import settings

class SignalEngine:
    async def analyze(self, symbol: str, timeframe: str) -> SignalResponse:
        tf=timeframe.upper()
        try:
            candles=await data_router.klines(symbol,tf,500)
        except Exception:
            return SignalResponse(symbol=symbol.upper(),timeframe=tf,direction='WAIT',grade='REJECT',score=0,
                setup=['Market data unavailable'],news_risk='UNKNOWN',state='NO_TRADE',action='NO TRADE',decision_reason='Market data unavailable')

        smc=analyze_smc(candles); score=0; setup=[]; direction='WAIT'
        if smc['bias']=='BULLISH': score+=16; direction='LONG'; setup.append('Bullish market structure')
        elif smc['bias']=='BEARISH': score+=16; direction='SHORT'; setup.append('Bearish market structure')

        event=smc['structure_event']
        structure_confirmed=event!='NONE'
        if structure_confirmed:
            score+=14; setup.append(event.replace('_',' ')); direction='LONG' if event.startswith('BULLISH') else 'SHORT'

        liq=smc['liquidity']
        direct_liquidity=False
        if direction=='LONG' and liq.get('sell_side_sweep'): score+=14; setup.append('Sell-side liquidity sweep'); direct_liquidity=True
        if direction=='SHORT' and liq.get('buy_side_sweep'): score+=14; setup.append('Buy-side liquidity sweep'); direct_liquidity=True

        prev=smc.get('previous_level_sweeps',{})
        previous_liquidity=False
        if direction=='LONG' and (prev.get('day_low_swept') or prev.get('week_low_swept')):
            score+=6; setup.append('Previous low liquidity raid'); previous_liquidity=True
        if direction=='SHORT' and (prev.get('day_high_swept') or prev.get('week_high_swept')):
            score+=6; setup.append('Previous high liquidity raid'); previous_liquidity=True
        liquidity_confirmed=direct_liquidity or previous_liquidity

        wanted='BULLISH_FVG' if direction=='LONG' else 'BEARISH_FVG'
        has_fvg=direction!='WAIT' and any(x['type']==wanted for x in smc['active_fvgs'])
        if has_fvg: score+=10; setup.append('Active Fair Value Gap')
        iwanted='BULLISH_IFVG' if direction=='LONG' else 'BEARISH_IFVG'
        has_ifvg=direction!='WAIT' and any(x['type']==iwanted for x in smc['inverse_fvgs'])
        if has_ifvg: score+=7; setup.append('Inverse FVG confirmation')

        d=smc['displacement']
        has_displacement=bool(d.get('qualified') and ((direction=='LONG' and d['direction']=='BULLISH') or (direction=='SHORT' and d['direction']=='BEARISH')))
        if has_displacement:
            score+=9; setup.append(f"Qualified {d['direction'].title()} displacement")

        ob_type='BULLISH_OB' if direction=='LONG' else 'BEARISH_OB'
        obs=[b for b in smc['order_blocks'] if b['type']==ob_type and b['state']!='BREAKER']
        has_ob=bool(obs)
        if has_ob: score+=8; setup.append(f"{obs[-1]['state'].title()} order block")

        q=smc.get('setup_quality',{})
        overlaps=q.get('fvg_ob_overlaps',[])
        compatible=[x for x in overlaps if (direction=='LONG' and x['fvg_type']=='BULLISH_FVG' and x['ob_type']=='BULLISH_OB') or (direction=='SHORT' and x['fvg_type']=='BEARISH_FVG' and x['ob_type']=='BEARISH_OB')]
        has_overlap=bool(compatible)
        if has_overlap: score+=6; setup.append('FVG + Order Block overlap')
        volatility_expanding=q.get('volatility_regime')=='EXPANDING' and has_displacement
        if volatility_expanding: score+=3; setup.append('Volatility expansion supports displacement')
        elif q.get('volatility_regime')=='COMPRESSED' and direction!='WAIT': score-=3; setup.append('Compressed volatility')

        pd=smc['premium_discount']['zone']
        pd_aligned=(direction=='LONG' and pd=='DISCOUNT') or (direction=='SHORT' and pd=='PREMIUM')
        if pd_aligned:
            score+=5; setup.append(f'{pd.title()} dealing range')

        ote=ote_zone(candles,direction) if direction!='WAIT' else {}
        in_ote=bool(ote.get('in_ote'))
        if in_ote: score+=7; setup.append('OTE 62%-79% retracement')

        sess=smc.get('session',{})
        kill_zone=sess.get('kill_zone')!='NONE'
        if kill_zone: score+=4; setup.append(sess['kill_zone'].replace('_',' ').title())

        # Higher timeframes are loaded concurrently to keep current-decision latency low.
        htfs=higher_timeframes(tf)
        async def load_htf(htf):
            try:
                return htf, await data_router.klines(symbol,htf,260)
            except Exception:
                return htf, None
        loaded=await asyncio.gather(*(load_htf(h) for h in htfs)) if htfs else []
        rows_by_tf={h:rows for h,rows in loaded if rows}
        mtf=summarize(rows_by_tf) if rows_by_tf else {'alignment':'MIXED','items':[]}
        aligned=(direction=='LONG' and mtf['alignment']=='BULLISH') or (direction=='SHORT' and mtf['alignment']=='BEARISH')
        if aligned: score+=10; setup.append('Higher-timeframe alignment')
        elif direction!='WAIT' and mtf['alignment']!='MIXED': score-=12; setup.append('Higher-timeframe conflict')

        last=candles[-1]; recent=candles[-20:]
        avg_volume=sum(x.volume for x in recent[:-1])/max(len(recent)-1,1)
        volume_expansion=last.volume>avg_volume*1.2
        if volume_expansion: score+=4; setup.append('Volume expansion')

        nr=await news_risk.risk_for(symbol)
        if nr['risk']=='LOW': score+=3; setup.append('News window clear')
        elif nr['risk']=='HIGH' or nr.get('locked'): score-=25; setup.append('High-impact news lock')
        elif nr['risk']=='UNKNOWN': setup.append('News feed unverified')

        score=max(0,min(score,100))
        if score>=settings.signal_aplus_min_score: grade='A+'
        elif score>=settings.signal_strong_min_score: grade='A'
        elif score>=70: grade='B'
        else: grade='REJECT'

        levels=trade_levels(candles,direction) if direction!='WAIT' else {}
        health=data_health.check_rows(symbol,tf,candles)
        if health.get('stale'): setup.append('Market data stale/unhealthy')

        entry_check=assess_entry_actionability(candles,direction,levels) if levels and direction!='WAIT' else {
            'status':'UNAVAILABLE','action':'NO TRADE','distance_atr':None,'current_price':candles[-1].close if candles else None
        }
        entry_status=entry_check['status']
        distance_atr=entry_check.get('distance_atr')
        current_price=entry_check.get('current_price')

        # Fresh NOW-plan fallback. If a 70+ directional setup has healthy data and
        # no active high-impact news lock, do not keep advertising a stale/missed
        # historical zone. Re-anchor execution to the synchronized current quote
        # using ATR + recent structural swings, then re-run actionability checks.
        data_ok=(not health.get('stale') and health.get('status')=='OK')
        hard_news_lock=bool(nr.get('locked')) or nr['risk']=='HIGH'
        if score >= 70 and direction in {'LONG','SHORT'} and data_ok and not hard_news_lock and entry_status not in {'IN_ENTRY','NEAR_ENTRY'}:
            fresh_levels=dynamic_trade_levels(candles,direction)
            fresh_check=assess_entry_actionability(candles,direction,fresh_levels) if fresh_levels else None
            if fresh_levels and fresh_check and fresh_check.get('status') in {'IN_ENTRY','NEAR_ENTRY'}:
                levels=fresh_levels
                entry_check=fresh_check
                entry_status=entry_check['status']
                distance_atr=entry_check.get('distance_atr')
                current_price=entry_check.get('current_price')
                setup.append('Dynamic current-price plan: ATR + recent swing structure')

        # Institutional-style core vs secondary confirmation model.
        # One core technical confirmation may be absent; 3/4 are required.
        execution_model=sum([has_fvg,has_ob,has_displacement])>=2
        core={
            'Higher-timeframe alignment': aligned,
            'Structure confirmation (BOS/CHoCH)': structure_confirmed,
            'Liquidity event/sweep': liquidity_confirmed,
            'Execution model (FVG/OB/displacement)': execution_model,
        }
        secondary={
            'FVG + Order Block overlap': has_overlap,
            'Inverse FVG': has_ifvg,
            'Premium/discount alignment': pd_aligned,
            'OTE retracement': in_ote,
            'Active session/kill zone': kill_zone,
            'Volume expansion': volume_expansion,
            'Volatility expansion': volatility_expanding,
            'News window clear': nr['risk']=='LOW',
        }
        decision=decide_current_action(
            timeframe=tf,score=score,direction=direction,rr=levels.get('rr'),entry_status=entry_status,
            data_ok=data_ok,news_risk=nr['risk'],news_locked=bool(nr.get('locked')),
            core_confirmations=core,secondary_confirmations=secondary,
        )
        state=decision['state']
        action=decision['decision']

        # Final live-plan invariant guard. The Current Signal card must never expose
        # historical SL/TP/Entry geometry. NO TRADE / confirmation-only states carry
        # no executable levels. Actionable/wait-entry states must be directionally sane
        # relative to the synchronized current price.
        plan_ok, plan_reason = trade_plan_sanity(direction, current_price, levels, action)
        if action in {'NO TRADE', 'WAIT FOR CONFIRMATION'}:
            visible_levels = {}
        elif not plan_ok:
            action = 'NO TRADE'
            state = 'NO_TRADE'
            decision['reason'] = f'Fresh trade plan rejected: {plan_reason}'
            visible_levels = {}
        else:
            visible_levels = levels

        # Current panel is about NOW, not historical failure labels.
        if action=='WAIT FOR ENTRY': setup.append('Qualified setup: waiting for fresh price entry')
        elif action=='WAIT FOR CONFIRMATION': setup.append('Directional idea exists but the minimum professional core gate is incomplete')
        elif action in {'BUY NOW','SELL NOW'}: setup.append('Current decision gate passed: fresh actionable entry')
        elif action=='NO TRADE': setup.append(f"Current decision: {decision['reason']}")

        response=SignalResponse(
            symbol=symbol.upper(),timeframe=tf,direction=direction if action!='NO TRADE' else ('WAIT' if direction=='WAIT' else direction),
            grade=grade,score=score,current_price=current_price,entry_low=visible_levels.get('entry_low'),entry_high=visible_levels.get('entry_high'),
            stop_loss=visible_levels.get('stop_loss'),take_profits=visible_levels.get('take_profits',[]),rr=visible_levels.get('rr'),
            setup=setup or ['No qualified confluence'],news_risk=nr['risk'],state=state,entry_status=entry_status,
            action=action,distance_to_entry_atr=distance_atr,signal_threshold=decision['threshold'],
            core_confirmations=decision['core_passed'],secondary_confirmations=decision['secondary_passed'],
            missing_confirmations=decision['missing_confirmations'],decision_reason=decision['reason'],
        )
        payload=response.model_dump()

        # Persist qualified 70+ current ideas and live executions; rejected noise is omitted.
        if score>=70 and state in {'LIVE','REVIEW'}:
            storage.save_signal_if_changed(payload, cooldown_seconds=45)
        await notifications.signal_alert(payload)
        return response

signal_engine=SignalEngine()
