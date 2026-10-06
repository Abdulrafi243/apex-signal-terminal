from typing import Literal
from pydantic import BaseModel, Field

class SignalResponse(BaseModel):
    symbol: str
    timeframe: str
    direction: Literal['LONG','SHORT','WAIT']
    grade: Literal['A+','A','B','REJECT']
    score: int
    current_price: float | None = None
    entry_low: float | None = None
    entry_high: float | None = None
    stop_loss: float | None = None
    take_profits: list[float] = Field(default_factory=list)
    rr: float | None = None
    setup: list[str] = Field(default_factory=list)
    news_risk: Literal['LOW','MEDIUM','HIGH','UNKNOWN'] = 'LOW'
    state: Literal['LIVE','REVIEW','NO_TRADE'] = 'NO_TRADE'
    entry_status: Literal['IN_ENTRY','NEAR_ENTRY','WAIT_ENTRY','MISSED','TP_ALREADY_REACHED','INVALIDATED','STALE_SETUP','UNAVAILABLE'] = 'UNAVAILABLE'
    action: str = 'NO TRADE'
    distance_to_entry_atr: float | None = None
    signal_threshold: int = 70
    core_confirmations: list[str] = Field(default_factory=list)
    secondary_confirmations: list[str] = Field(default_factory=list)
    missing_confirmations: list[str] = Field(default_factory=list)
    decision_reason: str = ''
