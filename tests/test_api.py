from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json() == {"message": "Hello, FastAPI!"}

def test_get_spot_invalid_symbol():
    # yfinance will simply return an empty history DataFrame
    # but you can assert the endpoint returns a 200 with a float or raises a clear error
    res = client.get("/api/spot?symbol=INVALIDSYM")
    assert res.status_code == 200
    data = res.json()
    assert "symbol" in data and "price" in data
    assert isinstance(data["price"], float)
