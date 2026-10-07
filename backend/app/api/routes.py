

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
