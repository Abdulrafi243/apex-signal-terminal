from __future__ import annotations
from datetime import datetime, timezone
from app.services.data_router import data_router
from app.services.forex_provider import forex_provider

TF_SECONDS={'1M':60,'5M':300,'15M':900,'30M':1800,'1H':3600,'4H':14400,'1D':86400}

class DataHealthService:
    def check_rows(self, symbol:str, timeframe:str, rows) -> dict:
        tf=timeframe.upper(); sym=symbol.upper(); provider='FOREX' if sym in {'XAUUSD','BTCUSD'} else 'BINANCE'
        if not rows:
            return {'status':'DOWN','symbol':sym,'timeframe':tf,'provider':provider,'reason':'NO_CANDLES','age_seconds':None,'stale':True}
        now_ms=int(datetime.now(timezone.utc).timestamp()*1000)
        # For an open live candle, close_time may be in the future. Use zero age in that case.
        age=max(0,(now_ms-rows[-1].close_time)/1000)
        threshold=TF_SECONDS.get(tf,900)*2.5
        stale=age>threshold
        return {
            'status':'DEGRADED' if stale else 'OK','symbol':sym,'timeframe':tf,'provider':provider,
            'last_close_time':rows[-1].close_time,'age_seconds':round(age,1),'stale':stale,
            'stale_after_seconds':round(threshold,1),'reason':'STALE_MARKET_DATA' if stale else 'FRESH'
        }

    async def check(self, symbol:str='BTCUSDT', timeframe:str='15M') -> dict:
        tf=timeframe.upper(); sym=symbol.upper(); provider='FOREX' if sym in {'XAUUSD','BTCUSD'} else 'BINANCE'
        if provider=='FOREX' and not forex_provider.configured:
            return {'status':'DEGRADED','symbol':sym,'timeframe':tf,'provider':'FOREX','reason':'FOREX_PROVIDER_NOT_CONFIGURED','age_seconds':None,'stale':True}
        try:
            rows=await data_router.klines(sym,tf,3)
            return self.check_rows(sym,tf,rows)
        except Exception:
            # Do not leak provider URLs, credentials or raw exceptions into the UI.
            return {'status':'DEGRADED','symbol':sym,'timeframe':tf,'provider':provider,'reason':'HEALTH_CHECK_TEMPORARILY_UNAVAILABLE','age_seconds':None,'stale':True}

data_health=DataHealthService()
