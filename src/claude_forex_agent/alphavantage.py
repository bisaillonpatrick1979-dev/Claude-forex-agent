"""Alpha Vantage API client — real-time forex OHLC data with server-side cache."""

import time
from datetime import datetime, timezone

import httpx

BASE_URL = "https://www.alphavantage.co/query"

_cache: dict[str, tuple] = {}
_CACHE_TTL = 300  # 5 minutes — free tier: 25 req/day; serverless cache is per-instance

_RATE_LIMIT_PHRASES = ("thank you for using alpha vantage", "higher api call volume")


def _is_rate_limited(data: dict) -> bool:
    note = (data.get("Note") or data.get("Information") or "").lower()
    return any(p in note for p in _RATE_LIMIT_PHRASES)


def _fetch(api_key: str, params: dict) -> dict:
    cache_key = "|".join(f"{k}={v}" for k, v in sorted(params.items()))
    if cache_key in _cache:
        data, ts = _cache[cache_key]
        if time.monotonic() - ts < _CACHE_TTL:
            return data
    resp = httpx.get(BASE_URL, params={**params, "apikey": api_key}, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    _cache[cache_key] = (data, time.monotonic())
    return data


def _unix(ts_str: str) -> int:
    return int(
        datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc).timestamp()
    )


def get_fx_intraday(api_key: str, from_sym: str, to_sym: str, interval: str) -> dict:
    data = _fetch(api_key, {
        "function": "FX_INTRADAY",
        "from_symbol": from_sym,
        "to_symbol": to_sym,
        "interval": interval,
        "outputsize": "compact",
    })
    key = f"Time Series FX ({interval})"
    if key not in data:
        if _is_rate_limited(data):
            return {"error": "RATE_LIMIT"}
        return {"error": data.get("Note") or data.get("Information") or str(data)}
    candles = [
        {
            "time": _unix(ts),
            "open": float(v["1. open"]),
            "high": float(v["2. high"]),
            "low": float(v["3. low"]),
            "close": float(v["4. close"]),
        }
        for ts, v in data[key].items()
    ]
    candles.sort(key=lambda c: c["time"])
    return {"pair": f"{from_sym}/{to_sym}", "interval": interval, "candles": candles}


def get_fx_daily(api_key: str, from_sym: str, to_sym: str) -> dict:
    data = _fetch(api_key, {
        "function": "FX_DAILY",
        "from_symbol": from_sym,
        "to_symbol": to_sym,
        "outputsize": "compact",
    })
    key = "Time Series FX (Daily)"
    if key not in data:
        if _is_rate_limited(data):
            return {"error": "RATE_LIMIT"}
        return {"error": data.get("Note") or data.get("Information") or str(data)}
    candles = [
        {
            "time": date,
            "open": float(v["1. open"]),
            "high": float(v["2. high"]),
            "low": float(v["3. low"]),
            "close": float(v["4. close"]),
        }
        for date, v in data[key].items()
    ]
    candles.sort(key=lambda c: c["time"])
    return {"pair": f"{from_sym}/{to_sym}", "interval": "1D", "candles": candles}
