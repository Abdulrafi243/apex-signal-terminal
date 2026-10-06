from __future__ import annotations
from dataclasses import dataclass, asdict
from math import sqrt
from statistics import mean as stat_mean
from app.analysis.smc import analyze_smc
from app.analysis.trade_setup import trade_levels
from app.models.candle import Candle

@dataclass
class BacktestTrade:
    entry_index:int
    exit_index:int
    direction:str
    entry:float
    stop:float
    target:float
    result:str
    gross_r:float
    cost_r:float
    net_r:float
    holding_bars:int
    score:int

class BacktestEngine:
    """Conservative deterministic replay.

    At bar i, the rule engine receives candles[:i+1] only. Costs are modeled
    explicitly and same-bar TP/SL ambiguity resolves to the stop first.
    """
    def _candidate(self, history:list[Candle]) -> tuple[str,int,dict] | None:
        smc=analyze_smc(history)
        direction='LONG' if smc['bias']=='BULLISH' else 'SHORT' if smc['bias']=='BEARISH' else 'WAIT'
        if direction=='WAIT': return None
        score=16
        if smc['structure_event']!='NONE': score+=14
        liq=smc['liquidity']
        if direction=='LONG' and liq.get('sell_side_sweep'): score+=14
        if direction=='SHORT' and liq.get('buy_side_sweep'): score+=14
        wanted='BULLISH_FVG' if direction=='LONG' else 'BEARISH_FVG'
        if any(x['type']==wanted for x in smc['active_fvgs']): score+=10
        d=smc['displacement']
        if d.get('qualified') and ((direction=='LONG' and d.get('direction')=='BULLISH') or (direction=='SHORT' and d.get('direction')=='BEARISH')): score+=9
        if score<40: return None
        try: levels=trade_levels(history,direction)
        except Exception: return None
        if not levels or not levels.get('take_profits'): return None
        return direction,score,levels

    @staticmethod
    def _cost_r(entry:float, risk:float, holding_bars:int, timeframe_minutes:int,
                fee_bps:float, slippage_bps:float, funding_bps_8h:float) -> float:
        if risk<=0 or entry<=0: return 0.0
        # Round trip fee + entry/exit slippage. Funding scales by holding time.
        transaction_pct=(2*fee_bps + 2*slippage_bps)/10000.0
        holding_hours=max(0.0, holding_bars*timeframe_minutes/60.0)
        funding_intervals=holding_hours/8.0
        funding_pct=max(0.0, funding_bps_8h)/10000.0*funding_intervals
        return ((transaction_pct+funding_pct)*entry)/risk

    def run(self, candles:list[Candle], warmup:int=120, max_holding_bars:int=48, min_score:int=54,
            fee_bps:float=4.0, slippage_bps:float=2.0, funding_bps_8h:float=1.0,
            timeframe_minutes:int=15) -> dict:
        trades:list[BacktestTrade]=[]; i=max(warmup,20)
        while i < len(candles)-1:
            cand=self._candidate(candles[:i+1])
            if not cand: i+=1; continue
            direction,score,lv=cand
            if score<min_score: i+=1; continue
            entry=(lv['entry_low']+lv['entry_high'])/2; stop=lv['stop_loss']; target=lv['take_profits'][0]
            risk=abs(entry-stop)
            if risk<=0: i+=1; continue
            result='TIMEOUT'; exit_idx=min(i+max_holding_bars,len(candles)-1); gross_r=0.0
            for j in range(i+1, min(i+max_holding_bars+1,len(candles))):
                c=candles[j]
                if direction=='LONG':
                    if c.low<=stop: result='LOSS'; exit_idx=j; gross_r=-1.0; break
                    if c.high>=target: result='WIN'; exit_idx=j; gross_r=abs(target-entry)/risk; break
                else:
                    if c.high>=stop: result='LOSS'; exit_idx=j; gross_r=-1.0; break
                    if c.low<=target: result='WIN'; exit_idx=j; gross_r=abs(entry-target)/risk; break
            holding=max(1,exit_idx-i)
            cost_r=self._cost_r(entry,risk,holding,timeframe_minutes,fee_bps,slippage_bps,funding_bps_8h)
            net_r=gross_r-cost_r
            trades.append(BacktestTrade(i,exit_idx,direction,entry,stop,target,result,gross_r,cost_r,net_r,holding,score))
            i=max(i+1,exit_idx)
        return self._metrics(trades, fee_bps, slippage_bps, funding_bps_8h)

    def _metrics(self,trades:list[BacktestTrade], fee_bps:float=0, slippage_bps:float=0, funding_bps_8h:float=0)->dict:
        rs=[t.net_r for t in trades]; wins=[x for x in rs if x>0]; losses=[x for x in rs if x<0]
        equity=0.0; peak=0.0; max_dd=0.0
        curve=[]
        for x in rs:
            equity+=x; peak=max(peak,equity); max_dd=max(max_dd,peak-equity); curve.append(round(equity,4))
        n=len(rs); avg=sum(rs)/n if n else 0
        variance=sum((x-avg)**2 for x in rs)/(n-1) if n>1 else 0
        sharpe=(avg/(sqrt(variance) or 1))*sqrt(n) if n else 0
        gross=sum(t.gross_r for t in trades); costs=sum(t.cost_r for t in trades)
        longs=[t for t in trades if t.direction=='LONG']; shorts=[t for t in trades if t.direction=='SHORT']
        def wr(xs): return round(sum(t.net_r>0 for t in xs)/len(xs)*100,2) if xs else 0.0
        return {
            'trades':n,'wins':len(wins),'losses':len(losses),'timeouts':sum(t.result=='TIMEOUT' for t in trades),
            'win_rate':round(len(wins)/n*100,2) if n else 0,'gross_r':round(gross,2),'costs_r':round(costs,3),'net_r':round(sum(rs),2),
            'profit_factor':round(sum(wins)/abs(sum(losses)),2) if losses else (999.0 if wins else 0),
            'expectancy_r':round(avg,3),'max_drawdown_r':round(max_dd,2),'sharpe_like':round(sharpe,2),
            'avg_holding_bars':round(stat_mean([t.holding_bars for t in trades]),1) if trades else 0,
            'long_win_rate':wr(longs),'short_win_rate':wr(shorts),'equity_curve':curve[-500:],
            'cost_model':{'fee_bps':fee_bps,'slippage_bps':slippage_bps,'funding_bps_8h':funding_bps_8h},
            'no_future_leakage':True,'same_bar_policy':'STOP_FIRST',
            'items':[asdict(t) for t in trades[-100:]]
        }

    def walk_forward(self, candles:list[Candle], folds:int=4, **kwargs)->dict:
        if folds<2: folds=2
        usable=len(candles)//folds
        out=[]
        for fold in range(folds):
            start=fold*usable; end=len(candles) if fold==folds-1 else (fold+1)*usable
            segment=candles[start:end]
            if len(segment)<max(kwargs.get('warmup',120)+20,150):
                continue
            result=self.run(segment,**kwargs)
            out.append({'fold':fold+1,'start_index':start,'end_index':end-1,
                        'trades':result['trades'],'win_rate':result['win_rate'],'net_r':result['net_r'],
                        'profit_factor':result['profit_factor'],'max_drawdown_r':result['max_drawdown_r']})
        positive=sum(x['net_r']>0 for x in out)
        return {'folds_requested':folds,'folds_tested':len(out),'positive_folds':positive,
                'consistency_pct':round(positive/len(out)*100,2) if out else 0,'items':out}

    def optimize_score(self, candles:list[Candle], score_values:list[int], **kwargs)->dict:
        rows=[]
        for score in sorted(set(score_values)):
            result=self.run(candles,min_score=score,**kwargs)
            rows.append({'min_score':score,'trades':result['trades'],'win_rate':result['win_rate'],
                         'net_r':result['net_r'],'profit_factor':result['profit_factor'],
                         'max_drawdown_r':result['max_drawdown_r'],'expectancy_r':result['expectancy_r']})
        # Prefer positive expectancy and adequate sample; then net R, then lower DD.
        eligible=[x for x in rows if x['trades']>=5 and x['expectancy_r']>0]
        pool=eligible or rows
        best=max(pool,key=lambda x:(x['net_r'],-x['max_drawdown_r'])) if pool else None
        return {'best':best,'candidates':rows,'warning':'Optimization is exploratory. Validate the selected threshold out-of-sample before live use.'}

    def stress_costs(self, candles:list[Candle], **kwargs)->dict:
        base_fee=float(kwargs.pop('fee_bps',4.0)); base_slip=float(kwargs.pop('slippage_bps',2.0)); base_funding=float(kwargs.pop('funding_bps_8h',1.0))
        scenarios=[]
        for name,mult in [('BASE',1.0),('STRESSED_1_5X',1.5),('STRESSED_2X',2.0)]:
            r=self.run(candles,fee_bps=base_fee*mult,slippage_bps=base_slip*mult,funding_bps_8h=base_funding*mult,**kwargs)
            scenarios.append({'scenario':name,'cost_multiplier':mult,'trades':r['trades'],'win_rate':r['win_rate'],'net_r':r['net_r'],'profit_factor':r['profit_factor'],'expectancy_r':r['expectancy_r'],'max_drawdown_r':r['max_drawdown_r']})
        base=scenarios[0] if scenarios else {}
        stressed=scenarios[-1] if scenarios else {}
        robust=bool(base.get('net_r',0)>0 and stressed.get('net_r',0)>0 and stressed.get('profit_factor',0)>=1.0)
        return {'robust_under_2x_costs':robust,'scenarios':scenarios,'note':'Deterministic execution-cost stress test; it does not guarantee future profitability.'}

backtest_engine=BacktestEngine()
