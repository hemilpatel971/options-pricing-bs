from math import log, sqrt, exp
from scipy.stats import norm

def black_scholes_price(
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    q: float,
    option_type: str
) -> float:
    """Compute Black–Scholes price with continuous dividend yield q for options."""
    # Intrinsic value at expiry
    if T <= 0:
        if option_type.lower() == "call":
            return max(0.0, S * exp(-q * T) - K)
        else:
            return max(0.0, K - S * exp(-q * T))

    # d1 and d2 adjusted for dividend yield q
    d1 = (log(S / K) + (r - q + 0.5 * sigma**2) * T) / (sigma * sqrt(T))
    d2 = d1 - sigma * sqrt(T)

    if option_type.lower() == "call":
        price = S * exp(-q * T) * norm.cdf(d1) - K * exp(-r * T) * norm.cdf(d2)
    else:
        price = K * exp(-r * T) * norm.cdf(-d2) - S * exp(-q * T) * norm.cdf(-d1)

    return price

def black_scholes_greeks(
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    q: float
) -> dict:
    """Compute the main Greeks (delta, gamma, theta, vega, rho) with dividend yield q."""
    # Zero greeks at expiry
    if T <= 0:
        return {
            "delta_call": 0.0,
            "delta_put": 0.0,
            "gamma": 0.0,
            "theta_call": 0.0,
            "theta_put": 0.0,
            "vega": 0.0,
            "rho_call": 0.0,
            "rho_put": 0.0,
        }

    # d1 and d2
    d1 = (log(S / K) + (r - q + 0.5 * sigma**2) * T) / (sigma * sqrt(T))
    d2 = d1 - sigma * sqrt(T)
    pdf = norm.pdf(d1)

    # Greeks
    delta_call = exp(-q * T) * norm.cdf(d1)
    delta_put = exp(-q * T) * (norm.cdf(d1) - 1)
    gamma = exp(-q * T) * pdf / (S * sigma * sqrt(T))
    theta_call = (
        - (S * q * exp(-q * T) * norm.cdf(d1))
        - (S * sigma * exp(-q * T) * pdf) / (2 * sqrt(T))
        - r * K * exp(-r * T) * norm.cdf(d2)
    )
    theta_put = (
        + (S * q * exp(-q * T) * (norm.cdf(d1) - 1))
        - (S * sigma * exp(-q * T) * pdf) / (2 * sqrt(T))
        + r * K * exp(-r * T) * norm.cdf(-d2)
    )
    vega = S * exp(-q * T) * pdf * sqrt(T)
    rho_call = K * T * exp(-r * T) * norm.cdf(d2)
    rho_put = -K * T * exp(-r * T) * norm.cdf(-d2)

    return {
        "delta_call": delta_call,
        "delta_put": delta_put,
        "gamma": gamma,
        "theta_call": theta_call,
        "theta_put": theta_put,
        "vega": vega,
        "rho_call": rho_call,
        "rho_put": rho_put,
    }
