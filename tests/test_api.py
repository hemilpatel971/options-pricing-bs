import pytest
from fastapi.testclient import TestClient
from datetime import date, timedelta
from main import app

client = TestClient(app)

def test_read_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json() == {"message": "Hello, FastAPI!"}

def test_calculate_without_dividend():
    # expiry 30 days from today
    exp = (date.today() + timedelta(days=30)).isoformat()
    payload = {
        "spot": 100.0,
        "strike": 100.0,
        "expiration": exp,
        "rate": 0.01,
        "volatility": 0.2,
        "dividend_yield": 0.0,
    }
    r = client.post("/api/bs/calculate", json=payload)
    assert r.status_code == 200
    data = r.json()
    # call and put should both be floats
    assert isinstance(data["call_price"], float)
    assert isinstance(data["put_price"], float)
    # greeks is a dict with the expected keys
    for g in ("delta_call","delta_put","gamma","theta_call","theta_put","vega","rho_call","rho_put"):
        assert g in data["greeks"]

def test_calculate_with_dividend_reduces_call():
    exp = (date.today() + timedelta(days=30)).isoformat()
    base = {
        "spot": 100.0,
        "strike": 100.0,
        "expiration": exp,
        "rate": 0.01,
        "volatility": 0.2,
    }
    # no dividend
    r0 = client.post("/api/bs/calculate", json={**base, "dividend_yield": 0.0})
    c0 = r0.json()["call_price"]
    # with dividend yield
    rq = client.post("/api/bs/calculate", json={**base, "dividend_yield": 0.05})
    cq = rq.json()["call_price"]
    assert cq < c0  # call price should be lower when dividends are paid

def test_calculate_bad_expiration():
    # expiration in the past should still return intrinsic at zero
    past = (date.today() - timedelta(days=5)).isoformat()
    payload = {
        "spot": 120.0,
        "strike": 100.0,
        "expiration": past,
        "rate": 0.01,
        "volatility": 0.2,
        "dividend_yield": 0.0,
    }
    r = client.post("/api/bs/calculate", json=payload)
    assert r.status_code == 200
    data = r.json()
    # intrinsic = max(S-K,0) → 20 for a call, 0 for a put
    assert pytest.approx(data["call_price"], rel=1e-3) == 20.0
    assert pytest.approx(data["put_price"], rel=1e-3)  == 0.0
