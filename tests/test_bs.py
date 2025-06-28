import pytest
from bs_model import black_scholes_price

def test_bs_zero_time_returns_intrinsic_call():
    # very short T should give intrinsic value
    price = black_scholes_price(
        S=100, K=90, T=0.0, r=0.01, sigma=0.3, q=0.02, option_type="call"
    )
    assert pytest.approx(price, rel=1e-6) == 10.0

def test_bs_zero_time_returns_intrinsic_put():
    price = black_scholes_price(
        S=80, K=100, T=0.0, r=0.01, sigma=0.3, q=0.02, option_type="put"
    )
    assert pytest.approx(price, rel=1e-6) == 20.0

def test_bs_dividend_effect():
    # with positive q, call price decreases relative to q=0
    p0 = black_scholes_price(S=100, K=100, T=1.0, r=0.01, sigma=0.2, q=0.0, option_type="call")
    p1 = black_scholes_price(S=100, K=100, T=1.0, r=0.01, sigma=0.2, q=0.05, option_type="call")
    assert p1 < p0

def test_bs_put_price_with_dividend():
    # ensure put price increases with dividends
    p0 = black_scholes_price(S=100, K=100, T=1.0, r=0.01, sigma=0.2, q=0.0, option_type="put")
    p1 = black_scholes_price(S=100, K=100, T=1.0, r=0.01, sigma=0.2, q=0.05, option_type="put")
    assert p1 > p0
