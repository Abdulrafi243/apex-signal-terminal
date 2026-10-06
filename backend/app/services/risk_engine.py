from __future__ import annotations
from datetime import datetime, timezone
from app.models.risk import RiskProfile, PositionRequest
from app.services.storage import storage

class RiskEngine:
    def position_size(self, req: PositionRequest) -> dict:
        distance=abs(req.entry-req.stop_loss)
        if distance <= 0: return {'valid':False,'reason':'Entry and stop cannot be equal.'}
        risk_amount=req.balance*(req.risk_pct/100)
        qty=risk_amount/distance
        notional=qty*req.entry
        margin=notional/max(req.leverage,1)
        return {'valid':True,'risk_amount':round(risk_amount,4),'stop_distance':round(distance,8),
                'quantity':round(qty,8),'notional':round(notional,4),'estimated_margin':round(margin,4),
                'effective_risk_pct':req.risk_pct}

    def daily_stats(self) -> dict:
        today=datetime.now(timezone.utc).date().isoformat()
        trades=[t for t in storage.trades(1000) if str(t['created_at']).startswith(today)]
        closed=[t for t in trades if t['result']!='OPEN']
        pnl=sum(float(t.get('pnl') or 0) for t in closed)
        wins=sum(1 for t in closed if float(t.get('pnl') or 0)>0)
        losses=sum(1 for t in closed if float(t.get('pnl') or 0)<0)
        streak=0
        for t in closed:
            if float(t.get('pnl') or 0)<0: streak+=1
            else: break
        return {'trades':len(trades),'closed':len(closed),'wins':wins,'losses':losses,'pnl':round(pnl,4),'consecutive_losses':streak,
                'open_trades':sum(1 for t in trades if t['result']=='OPEN')}

    def gate(self, profile: RiskProfile, requested_leverage: float=1.0) -> dict:
        s=self.daily_stats(); reasons=[]
        daily_loss_limit=profile.account_balance*(profile.daily_loss_limit_pct/100)
        if s['pnl'] <= -daily_loss_limit: reasons.append('DAILY_LOSS_LIMIT_REACHED')
        if s['consecutive_losses'] >= profile.max_consecutive_losses: reasons.append('CONSECUTIVE_LOSS_LOCK')
        if s['open_trades'] >= profile.max_open_trades: reasons.append('MAX_OPEN_TRADES')
        if requested_leverage > profile.max_leverage: reasons.append('LEVERAGE_LIMIT')
        return {'allowed':not reasons,'reasons':reasons,'stats':s,'daily_loss_limit_amount':round(daily_loss_limit,2),
                'max_leverage':profile.max_leverage}

risk_engine=RiskEngine()
