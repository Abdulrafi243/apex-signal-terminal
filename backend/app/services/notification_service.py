from app.services.storage import storage
from app.services.delivery import delivery

class NotificationService:
    async def signal_alert(self, signal: dict):
        # User preference: actionable signals begin at 70+, but only BUY NOW / SELL NOW notify.
        if signal.get('state') != 'LIVE' or int(signal.get('score') or 0) < 70:
            return None
        if signal.get('action') not in ('BUY NOW','SELL NOW'):
            return None
        if signal.get('entry_status') not in ('IN_ENTRY','NEAR_ENTRY'):
            return None
        score=int(signal.get('score') or 0)
        title=f"{signal['action']} — {signal['symbol']} {signal['timeframe']} · {score}/100"
        lo=signal.get('entry_low'); hi=signal.get('entry_high'); current=signal.get('current_price')
        entry=f"{lo:.6g}-{hi:.6g}" if lo is not None and hi is not None else '-'
        current_txt=f"{current:.6g}" if current is not None else '-'
        tps=signal.get('take_profits') or []
        tp1=f"{tps[0]:.6g}" if tps else '-'
        message=f"Current {current_txt} · Entry {entry} · SL {signal.get('stop_loss') or '-'} · TP1 {tp1} · RR {signal.get('rr') or '-'}"
        severity='CRITICAL' if score>=92 else 'HIGH' if score>=88 else 'MEDIUM'
        notification_id=storage.notify_once('SIGNAL',title,message,signal.get('symbol'),signal.get('timeframe'),severity,cooldown_seconds=900)
        if notification_id:
            await delivery.deliver({'id':notification_id,'kind':'SIGNAL','title':title,'message':message,'symbol':signal.get('symbol'),'timeframe':signal.get('timeframe'),'severity':severity})
        return notification_id

    async def risk_alert(self, symbol:str, timeframe:str, reason:str):
        title=f'Risk lock — {symbol} {timeframe}'
        notification_id=storage.notify_once('RISK',title,reason,symbol,timeframe,'HIGH',cooldown_seconds=600)
        if notification_id:
            await delivery.deliver({'id':notification_id,'kind':'RISK','title':title,'message':reason,'symbol':symbol,'timeframe':timeframe,'severity':'HIGH'})
        return notification_id

notifications=NotificationService()
