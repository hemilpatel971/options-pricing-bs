import React, { useEffect, useState } from 'react';

interface SpotResponse {
  symbol:   string;
  company:  string;
  spot:     number;
  change:   number;
}

interface BSInputs {
  spot:          number;
  strike:        number;
  days:          number;
  volatility:    number;
  rate:          number;
  dividendYield: number;
}

interface SpotPanelProps {
  symbol:       string;
  bsInputs?:    BSInputs;
  callPrice?:   number;
  putPrice?:    number;
}

export default function SpotPanel({
  symbol,
  bsInputs,
  callPrice,
  putPrice
}: SpotPanelProps) {
  const [data, setData]   = useState<SpotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setData(null);
      setError(null);
      return;
    }
    fetch(`/api/bs/spot?ticker=${symbol}`)
      .then(r => {
        if (!r.ok) throw new Error('Ticker not found');
        return r.json();
      })
      .then((d: SpotResponse) => {
        setData(d);
        setError(null);
      })
      .catch(e => {
        setData(null);
        setError(e.message);
      });
  }, [symbol]);

  return (
    <div className="space-y-1">
      <h2 className="text-2xl text-primary-500 font-bold mb-2">
        Black-Scholes Model
      </h2>
      <h2 className="text-xs font-extralight mb-3">
        Data is delayed by 15 min (using yfinance API)
      </h2>

      {!symbol && <p className="text-text-secondary">Enter a ticker above.</p>}
      {symbol && error && <p className="text-red-500">{error}</p>}
      {symbol && !error && !data && <p>Loading…</p>}

      {data && (
        <>
          <p className="text-xs font-semibold flex items-center">
            {data.symbol}
            <span
              className={`ml-2 text-xs font-medium ${
                data.change >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              ${data.spot.toFixed(2)}
            </span>
            <span
              className={`ml-2 text-xs font-medium ${
                data.change >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              ({data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%)
            </span>
          </p>
          <h1 className="text-2xl font-bold">{data.company}</h1>
          <p className="text-4xl font-bold">${data.spot.toFixed(2)}</p>
        </>
      )}

      {bsInputs && (callPrice != null || putPrice != null) && (
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="mt-4 mb-2 text-xm font-bold">Inputs Used</h3>
           
              <p><span className="font-semibold">Spot:</span> ${bsInputs.spot.toFixed(2)}</p>
              <p><span className="font-semibold">Strike:</span> ${bsInputs.strike.toFixed(2)}</p>
              <p><span className="font-semibold">Days:</span> {bsInputs.days}</p>
              <p><span className="font-semibold">Volatility:</span> {bsInputs.volatility.toFixed(2)}%</p>
              <p><span className="font-semibold">Rate:</span> {bsInputs.rate.toFixed(2)}%</p>
              <p><span className="font-semibold">Div:</span> {bsInputs.dividendYield.toFixed(2)}%</p>
            
          </div>

          <div className="flex space-x-8">
            {callPrice != null && (
              <div>
                <p className="text-sm font-medium text-green-500">Call Price</p>
                <p className="text-3xl font-bold text-green-500">
                  ${callPrice.toFixed(2)}
                </p>
              </div>
            )}
            {putPrice != null && (
              <div>
                <p className="text-sm font-medium text-red-500">Put Price</p>
                <p className="text-3xl font-bold text-red-500">
                  ${putPrice.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
