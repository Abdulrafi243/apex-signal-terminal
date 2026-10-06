from app.services.binance_futures import binance_futures
from app.services.forex_provider import forex_provider

def is_forex(symbol:str)->bool:
    return symbol.upper().replace('/','') in {'XAUUSD','BTCUSD'}

class DataRouter:
    async def klines(self,symbol:str,timeframe:str,limit:int):
        return await (forex_provider.klines(symbol,timeframe,limit) if is_forex(symbol) else binance_futures.klines(symbol,timeframe,limit))
    async def stream_klines(self,symbol:str,timeframe:str):
        gen=forex_provider.stream_klines(symbol,timeframe) if is_forex(symbol) else binance_futures.stream_klines(symbol,timeframe)
        async for item in gen: yield item
    def provider_name(self,symbol:str)->str:
        return 'twelvedata' if is_forex(symbol) else 'binance-usdm'

data_router=DataRouter()
