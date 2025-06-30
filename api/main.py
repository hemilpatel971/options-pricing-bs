from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from datetime import date
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor, as_completed
from api.bs_model import black_scholes_price, black_scholes_greeks
import numpy as np
from typing import List
import requests 

app = FastAPI()

# Root health check
@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

# 1. Update get_spot to include open & pct_change
@app.get("/api/bs/spot")
def get_spot(ticker: str):
    tk = yf.Ticker(ticker)

    # 1) fetch company name
    info = tk.info or {}
    name = info.get("longName") or info.get("shortName", "")

    # 2) fetch spot price (current market price or last close)
    price = info.get("regularMarketPrice")
    if price is None:
        hist = tk.history(period="1d", interval="1m")
        if not hist.empty:
            price = hist["Close"].iloc[-1]
    if price is None:
        raise HTTPException(404, f"Ticker {ticker} not found or no price data")

    # 3) fetch today’s open price
    open_price = info.get("regularMarketOpen")
    if open_price is None:
        # fallback: grab the very first “Open” from today's intraday bars
        hist = tk.history(period="1d", interval="1m")
        if not hist.empty:
            open_price = hist["Open"].iloc[0]
    if open_price is None:
        # if still missing, we can’t compute change
        raise HTTPException(500, f"Could not determine open price for {ticker}")

    # 4) compute percentage change since open
    pct_change = ((price - open_price) / open_price) * 100

    return {
        "symbol":  ticker.upper(),
        "company": name,
        "spot":    float(price),
        "open":    float(open_price),
        "change":  round(pct_change, 2)  # e.g. +1.23 (%)
    }

# 2. Expirations
@app.get("/api/bs/expirations")
def get_expirations(ticker: str):
    """
    Returns the available expiration dates for a given ticker.
    """
    try:
        tk = yf.Ticker(ticker)
        return {"expirations": tk.options}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch expirations for {ticker}: {e}")


# 3. Option chain
@app.get("/api/bs/option_chain")
def get_option_chain(ticker: str, expiration: date):
    """
    Returns the call and put option chains for a given ticker and expiration date.
    """
    try:
        tk = yf.Ticker(ticker)
        exp_str = expiration.isoformat()

        if exp_str not in tk.options:
            raise HTTPException(status_code=404, detail=f"Invalid expiration date: {exp_str}. Please choose from available expirations.")

        chain = tk.option_chain(exp_str)

        if chain.calls.empty and chain.puts.empty:
            raise HTTPException(status_code=404, detail="No option data found for the given ticker and expiration.")

        # --- FIX: Replace NaN with None for JSON compatibility ---
        calls_df = chain.calls.replace({np.nan: None})
        puts_df = chain.puts.replace({np.nan: None})

        return {
            "calls": calls_df.to_dict(orient="records"),
            "puts": puts_df.to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")



# 4. Black–Scholes calculation with dividend yield
class CalcReq(BaseModel):
    spot: float = Field(..., gt=0)
    strike: float = Field(..., gt=0)
    expiration: date
    rate: float = Field(..., ge=0)
    volatility: float = Field(..., gt=0)
    dividend_yield: float = Field(0.0, ge=0.0)

class CalcResp(BaseModel):
    call_price: float
    put_price: float
    greeks: dict

@app.post("/api/bs/calculate", response_model=CalcResp)
def calculate(req: CalcReq):
    # Time to expiration in years
    T = (req.expiration - date.today()).days / 365.0

    # Theoretical prices accounting for continuous dividend yield (q)
    call_price = black_scholes_price(
        S=req.spot,
        K=req.strike,
        T=T,
        r=req.rate,
        sigma=req.volatility,
        q=req.dividend_yield,
        option_type="call",
    )
    put_price = black_scholes_price(
        S=req.spot,
        K=req.strike,
        T=T,
        r=req.rate,
        sigma=req.volatility,
        q=req.dividend_yield,
        option_type="put",
    )

    greeks = black_scholes_greeks(
        S=req.spot,
        K=req.strike,
        T=T,
        r=req.rate,
        sigma=req.volatility,
        q=req.dividend_yield,
    )

    return CalcResp(call_price=call_price, put_price=put_price, greeks=greeks)

# 5. Search api to search stock price
class SearchResult(BaseModel):
    symbol: str
    name: str

@app.get("/api/bs/search", response_model=List[SearchResult])
def search_ticker(q: str):
    """
    Autocomplete tickers using Yahoo's public autoc endpoint.
    """
    if not q or len(q) < 1:
        return []
    url = "https://autoc.finance.yahoo.com/autoc"
    params = {
        "query": q,
        "region": 1,
        "lang": "en"
    }
    try:
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        results = data.get("ResultSet", {}).get("Result", [])
    except Exception as e:
        # return empty list on error rather than 500
        return []

    out: List[SearchResult] = []
    for r in results:
        sym = r.get("symbol")
        name = r.get("name") or r.get("exchDisp") or ""
        if sym and name:
            out.append(SearchResult(symbol=sym, name=name))
    return out

# 6. Heatmap of theoretical option prices (default 10×10 grid) for both call and put
class HeatmapReq(BaseModel):
    strike: float = Field(..., gt=0)
    expiration: date
    rate: float = Field(..., ge=0)
    dividend_yield: float = Field(0.0, ge=0.0)
    spot_min: float = Field(..., gt=0)
    spot_max: float = Field(..., gt=0)
    spot_steps: int = Field(10, gt=1)  # default to 10 points
    vol_min: float = Field(..., ge=0)
    vol_max: float = Field(..., ge=0)
    vol_steps: int = Field(10, gt=1)   # default to 10 points

class HeatmapResp(BaseModel):
    spots: list[float]
    vols: list[float]
    call_prices: list[list[float]]
    put_prices: list[list[float]]


@app.post("/api/bs/heatmap", response_model=HeatmapResp)
def heatmap(req: HeatmapReq):
    """
    Generate a heatmap grid of Black–Scholes prices over spot and volatility ranges for both call and put.
    Uses multithreading to compute call and put prices simultaneously.
    """
    T = (req.expiration - date.today()).days / 365.0
    spot_step = (req.spot_max - req.spot_min) / (req.spot_steps - 1)
    spots = [req.spot_min + i * spot_step for i in range(req.spot_steps)]
    vol_step = (req.vol_max - req.vol_min) / (req.vol_steps - 1)
    vols = [req.vol_min + j * vol_step for j in range(req.vol_steps)]

    # Preallocate grids
    call_prices = [[0.0] * len(spots) for _ in vols]
    put_prices = [[0.0] * len(spots) for _ in vols]

    # Worker function
    def compute(idx_vol, idx_spot, S, vol):
        c = black_scholes_price(S=S, K=req.strike, T=T, r=req.rate,
            sigma=vol, q=req.dividend_yield, option_type="call")
        p = black_scholes_price(S=S, K=req.strike, T=T, r=req.rate,
            sigma=vol, q=req.dividend_yield, option_type="put")
        return idx_vol, idx_spot, c, p

    # Execute in thread pool
    with ThreadPoolExecutor() as executor:
        futures = []
        for i, vol in enumerate(vols):
            for j, S in enumerate(spots):
                futures.append(executor.submit(compute, i, j, S, vol))
        for future in as_completed(futures):
            i, j, c, p = future.result()
            call_prices[i][j] = c
            put_prices[i][j] = p

    return {"spots": spots, "vols": vols, "call_prices": call_prices, "put_prices": put_prices}
