from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.services.data_router import data_router


app = FastAPI(
    title="Apex Signal API",
    version="1.0.0",
    description="Analysis-first trading terminal backend. Live execution disabled.",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(
        set(
            [
                x.strip()
                for x in settings.cors_origins.split(",")
                if x.strip()
            ]
            + [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "https://apex-signal-terminal-fuia.vercel.app",
            ]
        )
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "name": "Apex Signal API",
        "docs": "/docs",
        "live_trading": False,
        "streaming": True,
    }


@app.websocket("/ws/market/{symbol}/{timeframe}")
async def market_stream(
    websocket: WebSocket,
    symbol: str,
    timeframe: str,
):
    await websocket.accept()

    try:
        async for candle in data_router.stream_klines(symbol, timeframe):
            await websocket.send_json(
                {
                    "type": "kline",
                    "symbol": symbol.upper(),
                    "timeframe": timeframe.upper(),
                    "candle": candle.model_dump(),
                }
            )

    except WebSocketDisconnect:
        return

    except Exception as exc:
        try:
            await websocket.send_json(
                {
                    "type": "error",
                    "message": str(exc),
                }
            )
        except Exception:
            pass

        try:
            await websocket.close(code=1011)
        except Exception:
            pass