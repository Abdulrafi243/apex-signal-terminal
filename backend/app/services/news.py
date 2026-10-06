from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
from typing import Any
import httpx
from app.core.config import settings

HIGH_IMPACT_KEYWORDS = (
    'non farm','nonfarm','nfp','cpi','inflation','fomc','federal funds','fed interest','interest rate',
    'powell','pce','gdp','unemployment','jobless claims','retail sales','ism','consumer confidence'
)
USD_KEYWORDS = ('usd','united states','us ','federal reserve','fed ','powell')
CRYPTO_KEYWORDS = ('bitcoin','btc','crypto','etf','sec','stablecoin','exchange hack','liquidation')

@dataclass
class CalendarEvent:
    title: str
    datetime: str
    impact: str
    currency: str = ''
    country: str = ''
    source: str = ''
    actual: Any = None
    forecast: Any = None
    previous: Any = None

class NewsRiskService:
    def _parse_dt(self, raw: Any) -> datetime | None:
        if raw is None: return None
        try:
            if isinstance(raw, (int,float)):
                return datetime.fromtimestamp(float(raw), tz=timezone.utc)
            s=str(raw).strip().replace('Z','+00:00')
            dt=datetime.fromisoformat(s)
            return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
        except Exception:
            return None

    def _impact(self, e: dict) -> str:
        raw=str(e.get('importance') or e.get('impact') or e.get('volatility') or '').strip().lower()
        title=str(e.get('title') or e.get('event') or e.get('name') or '').lower()
        if raw in {'high','3','3.0','red'} or any(k in title for k in HIGH_IMPACT_KEYWORDS): return 'HIGH'
        if raw in {'medium','2','2.0','orange','moderate'}: return 'MEDIUM'
        return 'LOW'

    def _normalize(self, e: dict) -> CalendarEvent | None:
        title=str(e.get('title') or e.get('event') or e.get('name') or '').strip()
        dt=self._parse_dt(e.get('datetime') or e.get('date') or e.get('time') or e.get('timestamp'))
        if not title or not dt: return None
        return CalendarEvent(
            title=title, datetime=dt.isoformat(), impact=self._impact(e),
            currency=str(e.get('currency') or e.get('symbol') or '').upper(),
            country=str(e.get('country') or ''), source=str(e.get('source') or settings.news_provider),
            actual=e.get('actual'), forecast=e.get('forecast'), previous=e.get('previous')
        )

    async def calendar(self, hours_before: int = 6, hours_after: int = 36, impact: str | None = None) -> dict:
        if not settings.news_calendar_url:
            return {'state':'PROVIDER_NOT_CONFIGURED','provider':settings.news_provider,'items':[],
                    'reason':'Configure NEWS_CALENDAR_URL and optional NEWS_API_KEY for live economic calendar.'}
        try:
            headers={'Authorization':f'Bearer {settings.news_api_key}'} if settings.news_api_key else {}
            async with httpx.AsyncClient(timeout=10) as client:
                r=await client.get(settings.news_calendar_url,headers=headers)
                r.raise_for_status(); payload=r.json()
            raw=payload.get('events',payload.get('data',payload if isinstance(payload,list) else [])) if isinstance(payload,(dict,list)) else []
            now=datetime.now(timezone.utc); start=now-timedelta(hours=hours_before); end=now+timedelta(hours=hours_after)
            items=[]
            for x in raw:
                if not isinstance(x,dict): continue
                ev=self._normalize(x)
                if not ev: continue
                dt=self._parse_dt(ev.datetime)
                if not dt or not (start <= dt <= end): continue
                if impact and ev.impact != impact.upper(): continue
                items.append(ev)
            items.sort(key=lambda x:x.datetime)
            return {'state':'LIVE','provider':settings.news_provider,'generated_at':now.isoformat(),'items':[asdict(x) for x in items]}
        except Exception as exc:
            return {'state':'UNAVAILABLE','provider':settings.news_provider,'items':[],
                    'reason':f'News provider unavailable: {type(exc).__name__}'}

    def _relevant(self, symbol: str, ev: dict) -> bool:
        s=symbol.upper(); text=f"{ev.get('title','')} {ev.get('currency','')} {ev.get('country','')}".lower()
        if s in {'XAUUSD','GOLD'}: return ev.get('currency')=='USD' or any(k in text for k in USD_KEYWORDS)
        if 'BTC' in s: return ev.get('currency')=='USD' or any(k in text for k in USD_KEYWORDS+CRYPTO_KEYWORDS)
        # USDT futures are highly sensitive to USD macro risk; only high-impact global/USD events block by default.
        if s.endswith('USDT'): return ev.get('currency') in {'USD',''} or any(k in text for k in USD_KEYWORDS+CRYPTO_KEYWORDS)
        return True

    async def risk_for(self, symbol: str) -> dict:
        cal=await self.calendar(hours_before=max(6, settings.news_post_lock_minutes//60+2), hours_after=8)
        if cal['state']!='LIVE':
            return {'symbol':symbol.upper(),'risk':'UNKNOWN','locked':False,'minutes_to_event':None,
                    'state':cal['state'],'reason':cal.get('reason','Economic calendar unverified.')}
        now=datetime.now(timezone.utc); nearest=None
        for e in cal['items']:
            if e['impact']!='HIGH' or not self._relevant(symbol,e): continue
            dt=self._parse_dt(e['datetime']);
            if not dt: continue
            mins=(dt-now).total_seconds()/60
            if nearest is None or abs(mins)<abs(nearest[1]): nearest=(e,mins)
        if nearest is None:
            return {'symbol':symbol.upper(),'risk':'LOW','locked':False,'minutes_to_event':None,'state':'LIVE','reason':'No nearby relevant high-impact event.'}
        e,mins=nearest
        locked=-settings.news_post_lock_minutes <= mins <= settings.news_pre_lock_minutes
        risk='HIGH' if locked else 'MEDIUM' if -60 <= mins <= 120 else 'LOW'
        return {'symbol':symbol.upper(),'risk':risk,'locked':locked,'minutes_to_event':round(mins,1),
                'event':e['title'],'event_time':e['datetime'],'impact':e['impact'],'state':'LIVE',
                'reason':'Relevant high-impact macro event proximity.'}

    async def historical_calendar(self, at: str, hours_before: int = 6, hours_after: int = 12) -> dict:
        """Point-in-time interface. Provider must return only information known at `at`."""
        target=self._parse_dt(at)
        if not target:
            return {'state':'INVALID_TIME','items':[],'reason':'Use ISO-8601 timestamp.'}
        if not settings.news_historical_url:
            return {'state':'PROVIDER_NOT_CONFIGURED','items':[],'point_in_time':target.isoformat(),
                    'reason':'Configure NEWS_HISTORICAL_URL with a point-in-time capable provider. Historical backtests must not use revised future information.'}
        try:
            headers={'Authorization':f'Bearer {settings.news_api_key}'} if settings.news_api_key else {}
            params={'at':target.isoformat(),'hours_before':hours_before,'hours_after':hours_after}
            async with httpx.AsyncClient(timeout=15) as client:
                r=await client.get(settings.news_historical_url,headers=headers,params=params); r.raise_for_status(); payload=r.json()
            raw=payload.get('events',payload.get('data',payload if isinstance(payload,list) else [])) if isinstance(payload,(dict,list)) else []
            items=[]
            for x in raw:
                if isinstance(x,dict):
                    ev=self._normalize(x)
                    if ev: items.append(asdict(ev))
            items.sort(key=lambda x:x['datetime'])
            return {'state':'LIVE','provider':settings.news_provider,'point_in_time':target.isoformat(),'items':items}
        except Exception as exc:
            return {'state':'UNAVAILABLE','items':[],'point_in_time':target.isoformat(),'reason':f'Historical news unavailable: {type(exc).__name__}'}

    async def macro_context(self, symbol: str) -> dict:
        risk=await self.risk_for(symbol)
        s=symbol.upper(); sensitivities=[]
        if s in {'XAUUSD','GOLD'}: sensitivities=['USD','Federal Reserve','real yields','inflation','NFP/PCE/CPI']
        elif 'BTC' in s: sensitivities=['USD liquidity','Federal Reserve','CPI/PCE','ETF/regulation','risk sentiment']
        elif s.endswith('USDT'): sensitivities=['BTC market regime','USD macro','crypto risk sentiment']
        return {'symbol':s,'risk':risk,'sensitivities':sensitivities,
                'policy':'HIGH impact lock overrides technical grade; UNKNOWN feed downgrades LIVE to REVIEW.'}

news_risk=NewsRiskService()
