from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from datetime import date
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor, as_completed
from bs_model import black_scholes_price, black_scholes_greeks

app = FastAPI()

# Root health check
@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

# 1. Spot price
@app.get("/api/bs/spot")
def get_spot(ticker: str):
    tk = yf.Ticker(ticker)
    # Try regular market price first, fallback to last close
    info_price = tk.info.get("regularMarketPrice")
    hist = tk.history(period="1d")
    price = info_price if info_price is not None else (hist["Close"].iloc[-1] if not hist.empty else None)
    if price is None:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not found or no price data")
    return {"spot": float(price)}

# 2. Expirations
@app.get("/api/bs/expirations")
def get_exps(ticker: str):
    exps = yf.Ticker(ticker).options
    return {"expirations": exps}

# 3. Option chain
@app.get("/api/bs/option_chain")
def get_chain(ticker: str, expiration: date):
    tk = yf.Ticker(ticker)
    exp_str = expiration.isoformat()
    if exp_str not in tk.options:
        raise HTTPException(status_code=404, detail="Invalid expiration")
    chain = tk.option_chain(exp_str)
    return {
        "calls": chain.calls.to_dict("records"),
        "puts": chain.puts.to_dict("records"),
    }

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

# 5. Heatmap of theoretical option prices (default 10×10 grid) for both call and put
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
