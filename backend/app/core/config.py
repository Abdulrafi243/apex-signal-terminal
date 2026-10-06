from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = 'development'
    cors_origins: str = 'http://localhost:5173,http://127.0.0.1:5173'
    binance_futures_base: str = 'https://fapi.binance.com'
    binance_futures_ws: str = 'wss://fstream.binance.com'
    forex_data_provider: str = 'twelvedata'
    twelve_data_api_key: str = ''
    twelve_data_base: str = 'https://api.twelvedata.com'
    twelve_data_ws: str = 'wss://ws.twelvedata.com/v1/quotes/price'
    news_provider: str = 'provider-neutral'
    news_calendar_url: str = ''
    news_historical_url: str = ''
    news_api_key: str = ''
    news_pre_lock_minutes: int = 30
    news_post_lock_minutes: int = 15
    database_url: str = 'postgresql+asyncpg://postgres:postgres@localhost:5432/apex_signal'
    redis_url: str = 'redis://localhost:6379/0'
    notification_webhook_url: str = ''
    telegram_bot_token: str = ''
    telegram_chat_id: str = ''
    signal_live_min_score: int = 70
    signal_aplus_min_score: int = 92
    signal_strong_min_score: int = 88
    signal_max_data_age_multiplier: float = 2.5
    _backend_dir = Path(__file__).resolve().parents[2]
    model_config = SettingsConfigDict(env_file=str(_backend_dir / '.env'), extra='ignore')

settings = Settings()


def release_readiness() -> dict:
    checks = {
        'binance_futures_configured': bool(settings.binance_futures_base and settings.binance_futures_ws),
        'forex_live_configured': bool(settings.forex_data_provider == 'twelvedata' and settings.twelve_data_api_key),
        'live_news_configured': bool(settings.news_calendar_url),
        'historical_news_configured': bool(settings.news_historical_url),
        'browser_notifications_available': True,
        'telegram_configured': bool(settings.telegram_bot_token and settings.telegram_chat_id),
        'webhook_configured': bool(settings.notification_webhook_url),
        'automatic_trade_execution_enabled': False,
    }
    critical = ['binance_futures_configured']
    signal_terminal_ready = all(checks[k] for k in critical)
    production_evidence_ready = signal_terminal_ready and checks['live_news_configured'] and checks['historical_news_configured']
    return {
        'signal_terminal_ready': signal_terminal_ready,
        'production_evidence_ready': production_evidence_ready,
        'checks': checks,
        'notes': [
            'Automatic order execution is intentionally disabled.',
            'Forex live mode requires TWELVE_DATA_API_KEY.',
            'News-aware historical validation requires NEWS_HISTORICAL_URL from a point-in-time capable provider.',
        ],
    }
