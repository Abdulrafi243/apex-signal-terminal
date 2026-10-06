from pydantic import BaseModel, Field

class RiskProfile(BaseModel):
    account_balance: float = Field(1000, gt=0)
    risk_per_trade_pct: float = Field(1.0, gt=0, le=5)
    daily_loss_limit_pct: float = Field(3.0, gt=0, le=20)
    max_consecutive_losses: int = Field(3, ge=1, le=10)
    max_leverage: float = Field(5.0, ge=1, le=125)
    max_open_trades: int = Field(3, ge=1, le=20)

class PositionRequest(BaseModel):
    balance: float = Field(..., gt=0)
    risk_pct: float = Field(1.0, gt=0, le=5)
    entry: float = Field(..., gt=0)
    stop_loss: float = Field(..., gt=0)
    leverage: float = Field(1.0, ge=1, le=125)

class TradeRecord(BaseModel):
    symbol: str
    timeframe: str
    direction: str
    entry: float
    stop_loss: float
    exit_price: float | None = None
    pnl: float = 0.0
    result: str = 'OPEN'
    grade: str = 'B'
    score: int = 0
    rr: float | None = None
    setup: list[str] = []
