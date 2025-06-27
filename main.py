from fastapi import FastAPI
from math import log, sqrt, exp, erf
import yfinance as yf

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

@app.get("/api/spot")
def get_spot(symbol: str):
    """
    Query parameter:
      - symbol: e.g. 'AAPL' or 'MSFT'
    Returns the latest close price (delayed ~15m).
    """
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period="1d")
    # Handle missing data (e.g., invalid symbol)
    if hist.empty:
        price = 0.0
    else:
        price = hist["Close"].iloc[-1]
    return {"symbol": symbol.upper(), "price": float(price)}


def normal_cdf(x: float) -> float:
    """Cumulative distribution function for standard normal."""
    return 0.5 * (1.0 + erf(x / sqrt(2.0)))


def bs_price(
    S: float,      # spot price
    K: float,      # strike price
    T: float,      # time to expiry (in years)
    r: float,      # risk-free rate (decimal, e.g. 0.03)
    sigma: float,  # volatility (decimal, e.g. 0.2)
    option_type: str  # "call" or "put"
) -> float:
    """Compute Black–Scholes price for a European call or put."""
    # If time to expiry is effectively zero, return intrinsic value
    if T <= 0 or T < 1e-5:
        return max(0.0, S - K) if option_type == "call" else max(0.0, K - S)

    d1 = (log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * sqrt(T))
    d2 = d1 - sigma * sqrt(T)

    if option_type == "call":
        return S * normal_cdf(d1) - K * exp(-r * T) * normal_cdf(d2)
    else:  # put
        return K * exp(-r * T) * normal_cdf(-d2) - S * normal_cdf(-d1)
