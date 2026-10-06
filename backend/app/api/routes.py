from fastapi import APIRouter, Query, HTTPException
import asyncio
from app.core.config import settings, release_readiness
from app.services.market_data import market_data
from app.services.signal_engine import signal_engine
from app.services.news import news_risk
from app.backtesting.engine import backtest_engine
from app.services.binance_futures import binance_futures
from app.services.data_router import data_router
from app.analysis.smc import analyze_smc
from app.analysis.trade_setup import trade_levels
from app.analysis.multitimeframe import higher_timeframes, summarize
from app.analysis.context import ote_zone, previous_extremes, session_context
from app.models.risk import RiskProfile, PositionRequest, TradeRecord
from app.services.risk_engine import risk_engine
from app.services.storage import storage
from app.services.cache import cache
from app.services.forex_provider import forex_provider, ForexRateLimited
from app.services.data_health import data_health
from app.services.delivery import delivery
from app.services.release_checks import run_release_checks

router = APIRouter()

@router.get('/health')
def health():
    return {'status': 'ok', 'environment': settings.app_env, 'live_trading': False, 'market_data': {'futures':'binance-usdm-ready','forex':forex_provider.status()}}


@router.get('/system/readiness')
def system_readiness():
    return release_readiness()

@router.get('/system/release-checks')
def system_release_checks():
    return run_release_checks()

@router.get('/backtest/news-aware-readiness')
def news_aware_backtest_readiness():
    ready = bool(settings.news_historical_url)
    return {
        'ready': ready,
        'state': 'READY' if ready else 'PROVIDER_NOT_CONFIGURED',
        'policy': 'Point-in-time historical economic data is mandatory; revised future data is rejected.',
    }

@router.get('/markets/symbols')
def symbols(market: str = Query('FUTURES', pattern='^(FOREX|FUTURES)$')):
    return {'market': market, 'symbols': market_data.symbols(market)}

@router.get('/markets/binance/symbols')
async def live_symbols():
    try:
        items = await binance_futures.exchange_symbols()
        return {'count': len(items), 'symbols': items}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f'Binance unavailable: {exc}')

@router.get('/markets/candles')
async def candles(symbol: str, timeframe: str = '15M', limit: int = Query(300, ge=50, le=1500)):
    try:
        rows = await data_router.klines(symbol, timeframe, limit)
        payload = {'symbol': symbol.upper(), 'timeframe': timeframe.upper(), 'count': len(rows), 'items': [x.model_dump() for x in rows]}
        if symbol.upper().replace('/', '') in {'XAUUSD','BTCUSD'}:
            fs = forex_provider.status()
            payload['feed_state'] = fs.get('state')
            payload['retry_in_seconds'] = fs.get('retry_in_seconds', 0)
        return payload
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ForexRateLimited:
        raise HTTPException(status_code=429, detail='Forex feed is rate limited. Retrying automatically.')
    except Exception:
        raise HTTPException(status_code=502, detail='Market data temporarily unavailable')

@router.get('/analysis/smc')
async def smc(symbol: str, timeframe: str = '15M'):
    try:
        rows = await data_router.klines(symbol, timeframe, 350)
        return {'symbol': symbol.upper(), 'timeframe': timeframe.upper(), **analyze_smc(rows)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f'Analysis unavailable: {exc}')


@router.get('/analysis/multi-timeframe')
async def multi_timeframe(symbol: str, timeframe: str = '15M'):
    rows_by_tf = {}
    for tf in [timeframe.upper(), *higher_timeframes(timeframe)]:
        try:
            rows_by_tf[tf] = await data_router.klines(symbol, tf, 250)
        except Exception:
            continue
    if not rows_by_tf:
        raise HTTPException(status_code=502, detail='No market data available')
    return {'symbol': symbol.upper(), 'requested_timeframe': timeframe.upper(), **summarize(rows_by_tf)}

@router.get('/analysis/trade-levels')
async def levels(symbol: str, timeframe: str = '15M', direction: str = Query('LONG', pattern='^(LONG|SHORT)$')):
    try:
        rows = await data_router.klines(symbol, timeframe, 350)
        data = trade_levels(rows, direction)
        return {'symbol': symbol.upper(), 'timeframe': timeframe.upper(), 'direction': direction, **data}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f'Level calculation unavailable: {exc}')

@router.get('/signals/current')
async def current_signal(symbol: str, timeframe: str = '15M'):
    return await signal_engine.analyze(symbol, timeframe)

@router.get('/scanner')
async def scanner(market: str = 'FUTURES', timeframe: str | None = None, limit: int = Query(12, ge=1, le=30)):
    market = market.upper(); tf = (timeframe or '15M').upper()
    if market == 'FOREX' and not forex_provider.configured:
        return {'market':market,'timeframe':tf,'count':0,'items':[],'state':'PROVIDER_NOT_CONFIGURED','provider':forex_provider.status()}
    symbols = market_data.symbols(market)[:limit]
    async def one(sym: str):
        return await cache.get_or_set(f'scan:{sym}:{tf}', 12.0, lambda: signal_engine.analyze(sym, tf))
    items = await asyncio.gather(*(one(s) for s in symbols))
    items = sorted(items, key=lambda x: (x.state == 'LIVE', x.score), reverse=True)
    return {'market': market, 'timeframe': tf, 'count': len(items), 'items': items, 'cache_ttl_seconds':12}

@router.get('/markets/forex/status')
def forex_status():
    return forex_provider.status()

@router.get('/system/data-health')
async def system_data_health(symbol: str = 'BTCUSDT', timeframe: str = '15M'):
    return await data_health.check(symbol,timeframe)

@router.get('/system/notification-channels')
def notification_channels():
    return delivery.status()

@router.get('/analysis/overlays')
async def overlay_bundle(symbol: str, timeframe: str = '15M'):
    async def build():
        rows = await data_router.klines(symbol, timeframe, 500)
        smc = analyze_smc(rows)
        direction = 'LONG' if smc['bias']=='BULLISH' else 'SHORT' if smc['bias']=='BEARISH' else 'LONG'
        levels = trade_levels(rows, direction)
        return {'symbol':symbol.upper(),'timeframe':timeframe.upper(),'generated_at':__import__('time').time(), 'smc':smc, 'trade_levels':levels}
    try:
        return await cache.get_or_set(f'overlay:{symbol.upper()}:{timeframe.upper()}', 8.0, build)
    except Exception as exc:
        raise HTTPException(status_code=502, detail='Overlay analysis temporarily unavailable')


@router.get('/analysis/context')
async def context(symbol: str, timeframe: str = '15M', direction: str = Query('LONG', pattern='^(LONG|SHORT)$')):
    try:
        rows = await data_router.klines(symbol, timeframe, 500)
        return {'symbol':symbol.upper(),'timeframe':timeframe.upper(),'session':session_context(rows),
                'previous_extremes':previous_extremes(rows),'ote':ote_zone(rows,direction)}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f'Context analysis unavailable: {exc}')

@router.get('/news/risk')
async def news(symbol: str):
    return await news_risk.risk_for(symbol)



@router.get('/news/calendar')
async def news_calendar(hours_before: int = Query(6, ge=0, le=72), hours_after: int = Query(36, ge=1, le=336), impact: str | None = Query(None, pattern='^(HIGH|MEDIUM|LOW)$')):
    return await news_risk.calendar(hours_before, hours_after, impact)

@router.get('/news/macro-context')
async def macro_context(symbol: str):
    return await news_risk.macro_context(symbol)

@router.get('/news/historical')
async def historical_news(at: str, hours_before: int = Query(6, ge=0, le=72), hours_after: int = Query(12, ge=1, le=168)):
    return await news_risk.historical_calendar(at,hours_before,hours_after)

@router.get('/backtest/run')
async def run_backtest(symbol: str, timeframe: str = '15M', limit: int = Query(1200, ge=300, le=1500), warmup: int = Query(120, ge=50, le=500), max_holding_bars: int = Query(48, ge=1, le=300), min_score: int = Query(80, ge=0, le=100), fee_bps: float = Query(4.0, ge=0, le=100), slippage_bps: float = Query(2.0, ge=0, le=100), funding_bps_8h: float = Query(1.0, ge=0, le=100)):
    try:
        rows = await data_router.klines(symbol, timeframe, limit)
        tf_minutes={'1M':1,'5M':5,'15M':15,'30M':30,'1H':60,'4H':240,'1D':1440}.get(timeframe.upper(),15)
        result = backtest_engine.run(rows, warmup=warmup, max_holding_bars=max_holding_bars, min_score=min_score, fee_bps=fee_bps, slippage_bps=slippage_bps, funding_bps_8h=funding_bps_8h, timeframe_minutes=tf_minutes)
        return {'symbol':symbol.upper(),'timeframe':timeframe.upper(),'sample_candles':len(rows),'parameters':{'warmup':warmup,'max_holding_bars':max_holding_bars,'min_score':min_score},**result}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f'Backtest unavailable: {exc}')

@router.get('/backtest/walk-forward')
async def walk_forward(symbol: str, timeframe: str = '15M', limit: int = Query(1500, ge=600, le=1500), folds: int = Query(4, ge=2, le=8), min_score: int = Query(80, ge=0, le=100), fee_bps: float = Query(4.0, ge=0, le=100), slippage_bps: float = Query(2.0, ge=0, le=100), funding_bps_8h: float = Query(1.0, ge=0, le=100)):
    try:
        rows=await data_router.klines(symbol,timeframe,limit)
        tf_minutes={'1M':1,'5M':5,'15M':15,'30M':30,'1H':60,'4H':240,'1D':1440}.get(timeframe.upper(),15)
        result=backtest_engine.walk_forward(rows,folds=folds,warmup=100,max_holding_bars=48,min_score=min_score,fee_bps=fee_bps,slippage_bps=slippage_bps,funding_bps_8h=funding_bps_8h,timeframe_minutes=tf_minutes)
        return {'symbol':symbol.upper(),'timeframe':timeframe.upper(),'sample_candles':len(rows),**result}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f'Walk-forward unavailable: {exc}')

@router.get('/backtest/stress-costs')
async def stress_costs(symbol: str, timeframe: str = '15M', limit: int = Query(1500, ge=600, le=1500), min_score: int = Query(80, ge=0, le=100), fee_bps: float = Query(4.0, ge=0, le=100), slippage_bps: float = Query(2.0, ge=0, le=100), funding_bps_8h: float = Query(1.0, ge=0, le=100)):
    try:
        rows=await data_router.klines(symbol,timeframe,limit)
        tf_minutes={'1M':1,'5M':5,'15M':15,'30M':30,'1H':60,'4H':240,'1D':1440}.get(timeframe.upper(),15)
        result=backtest_engine.stress_costs(rows,warmup=100,max_holding_bars=48,min_score=min_score,fee_bps=fee_bps,slippage_bps=slippage_bps,funding_bps_8h=funding_bps_8h,timeframe_minutes=tf_minutes)
        return {'symbol':symbol.upper(),'timeframe':timeframe.upper(),'sample_candles':len(rows),**result}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f'Cost stress test unavailable: {exc}')

@router.get('/backtest/optimize')
async def optimize_backtest(symbol: str, timeframe: str = '15M', limit: int = Query(1500, ge=600, le=1500), fee_bps: float = Query(4.0, ge=0, le=100), slippage_bps: float = Query(2.0, ge=0, le=100), funding_bps_8h: float = Query(1.0, ge=0, le=100)):
    try:
        rows=await data_router.klines(symbol,timeframe,limit)
        tf_minutes={'1M':1,'5M':5,'15M':15,'30M':30,'1H':60,'4H':240,'1D':1440}.get(timeframe.upper(),15)
        result=backtest_engine.optimize_score(rows,[70,75,80,84,88,92],warmup=100,max_holding_bars=48,fee_bps=fee_bps,slippage_bps=slippage_bps,funding_bps_8h=funding_bps_8h,timeframe_minutes=tf_minutes)
        return {'symbol':symbol.upper(),'timeframe':timeframe.upper(),'sample_candles':len(rows),**result}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f'Optimization unavailable: {exc}')

@router.post('/risk/position-size')
def position_size(req: PositionRequest):
    return risk_engine.position_size(req)

@router.post('/risk/gate')
def risk_gate(profile: RiskProfile, leverage: float = 1.0):
    return risk_engine.gate(profile, leverage)

@router.get('/risk/daily')
def daily_risk():
    return risk_engine.daily_stats()

@router.post('/journal/trades')
def add_trade(trade: TradeRecord):
    return {'id': storage.add_trade(trade.model_dump()), 'status':'saved'}

@router.get('/journal/trades')
def trade_history(limit: int = Query(100, ge=1, le=1000)):
    return {'items': storage.trades(limit)}

@router.post('/journal/trades/{trade_id}/close')
def close_trade(trade_id: int, exit_price: float, pnl: float, result: str = 'CLOSED'):
    storage.close_trade(trade_id, exit_price, pnl, result)
    return {'status':'closed','id':trade_id}

@router.get('/signals/history')
def signal_history(limit: int = Query(100, ge=1, le=1000)):
    return {'items': storage.signals(limit)}

@router.get('/notifications')
def notification_history(unread_only: bool = False, limit: int = Query(100, ge=1, le=500)):
    return {'items': storage.notifications(unread_only, limit)}

@router.post('/notifications/{notification_id}/read')
def read_notification(notification_id: int):
    storage.mark_read(notification_id)
    return {'status':'read','id':notification_id}

@router.post('/notifications/read-all')
def read_all_notifications():
    count = storage.mark_all_read()
    return {'status':'read','count':count}

@router.get('/dashboard/summary')
def dashboard_summary():
    return storage.summary()
