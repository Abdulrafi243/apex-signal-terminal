from __future__ import annotations
import httpx
from app.core.config import settings

class DeliveryService:
    async def deliver(self, payload:dict) -> dict:
        results=[]
        if settings.notification_webhook_url:
            try:
                async with httpx.AsyncClient(timeout=8) as client:
                    r=await client.post(settings.notification_webhook_url,json=payload)
                    results.append({'channel':'webhook','ok':r.is_success,'status_code':r.status_code})
            except Exception as exc:
                results.append({'channel':'webhook','ok':False,'error':str(exc)})
        if settings.telegram_bot_token and settings.telegram_chat_id:
            try:
                url=f'https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage'
                text=f"{payload.get('title','APEX alert')}\n{payload.get('message','')}"
                async with httpx.AsyncClient(timeout=8) as client:
                    r=await client.post(url,json={'chat_id':settings.telegram_chat_id,'text':text})
                    results.append({'channel':'telegram','ok':r.is_success,'status_code':r.status_code})
            except Exception as exc:
                results.append({'channel':'telegram','ok':False,'error':str(exc)})
        if not results:
            results.append({'channel':'database/browser-polling','ok':True,'note':'No external delivery channel configured'})
        return {'delivered':any(x.get('ok') for x in results),'channels':results}

    def status(self)->dict:
        return {
            'database_browser_polling':True,
            'webhook_configured':bool(settings.notification_webhook_url),
            'telegram_configured':bool(settings.telegram_bot_token and settings.telegram_chat_id),
        }

delivery=DeliveryService()
