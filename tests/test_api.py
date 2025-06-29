import pytest
from fastapi.testclient import TestClient
from datetime import date, timedelta
from api.main import app

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

def test_heatmap_endpoint_default_grid():
    """
    POST /api/bs/heatmap without specifying spot_steps/vol_steps
    should return the default 10×10 grid.
    """

    # Prepare inputs
    exp = (date.today() + timedelta(days=30)).isoformat()
    payload = {
        "strike": 100.0,
        "expiration": exp,
        "rate": 0.01,
        "dividend_yield": 0.0,
        "spot_min": 90.0,
        "spot_max": 110.0,
        # omit spot_steps & vol_steps to use defaults (10)
        "vol_min": 0.1,
        "vol_max": 0.3,
    }

    res = client.post("/api/bs/heatmap", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Check top‐level keys
    assert set(data.keys()) == {"spots", "vols", "call_prices", "put_prices"}

    # Default grid size is 10×10
    assert isinstance(data["spots"], list) and len(data["spots"]) == 10
    assert isinstance(data["vols"], list)  and len(data["vols"])  == 10

    # Each row of prices must match the length of spots
    assert all(len(row) == len(data["spots"]) for row in data["call_prices"])
    assert all(len(row) == len(data["spots"]) for row in data["put_prices"])

    # Number of rows must match number of vols
    assert len(data["call_prices"]) == len(data["vols"])
    assert len(data["put_prices"])  == len(data["vols"])

def test_heatmap_endpoint_custom_grid():
    """
    POST /api/bs/heatmap with custom spot_steps/vol_steps
    to verify arbitrary grid sizing.
    """
    from datetime import date, timedelta

    exp = (date.today() + timedelta(days=90)).isoformat()
    payload = {
        "strike": 50.0,
        "expiration": exp,
        "rate": 0.02,
        "dividend_yield": 0.01,
        "spot_min": 40.0,
        "spot_max": 60.0,
        "spot_steps": 5,
        "vol_min": 0.05,
        "vol_max": 0.15,
        "vol_steps": 4,
    }

    res = client.post("/api/bs/heatmap", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Check custom grid dimensions
    assert len(data["spots"]) == 5
    assert len(data["vols"])  == 4
    assert len(data["call_prices"]) == 4
    assert len(data["put_prices"])  == 4

    # All rows match spot length
    assert all(len(r) == 5 for r in data["call_prices"])
    assert all(len(r) == 5 for r in data["put_prices"])
