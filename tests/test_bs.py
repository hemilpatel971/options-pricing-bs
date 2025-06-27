from main import bs_price

def test_bs_at_the_money_call():
    # S = K, very short time, zero rate, price ≈ intrinsic = 0
    price = bs_price(S=100, K=100, T=1e-6, r=0.0, sigma=0.2, option_type="call")
    assert abs(price) < 1e-3

def test_bs_known_value_put():
    price = bs_price(S=50, K=40, T=0.5, r=0.01, sigma=0.3, option_type="put")
    # Black–Scholes actually gives ≈0.679 for these params
    assert 0.67 < price < 0.69

