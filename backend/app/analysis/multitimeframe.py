from __future__ import annotations
from app.analysis.smc import analyze_smc

TF_MAP = {
    '1M':['5M','15M','1H'], '5M':['15M','1H','4H'], '15M':['1H','4H','1D'],
    '30M':['1H','4H','1D'], '1H':['4H','1D'], '4H':['1D'], '1D':[]
}

def higher_timeframes(tf: str) -> list[str]:
    return TF_MAP.get(tf.upper(), ['1H','4H'])

def summarize(rows_by_tf: dict[str, list]) -> dict:
    items=[]
    bulls=bears=0
    for tf, rows in rows_by_tf.items():
        smc=analyze_smc(rows)
        bias=smc['bias']
        bulls += bias == 'BULLISH'; bears += bias == 'BEARISH'
        items.append({'timeframe':tf,'bias':bias,'event':smc['structure_event']})
    alignment = 'BULLISH' if bulls > bears else 'BEARISH' if bears > bulls else 'MIXED'
    return {'alignment':alignment,'items':items,'bullish_count':bulls,'bearish_count':bears}
