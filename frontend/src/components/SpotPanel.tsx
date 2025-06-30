import React, { useEffect, useState } from 'react';

interface SpotProps {
  symbol: string;
}

interface SpotResponse {
  symbol: string;
  company: string;
  spot: number;
  change: number;      // percentage change since open
}

export default function SpotPanel({ symbol }: SpotProps) {
  const [data, setData] = useState<SpotResponse | null>(null);
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
    <div className="space-y-1 bg-transparent shadow-none border-none">
      {/* Model heading with extra bottom margin */}
      <h2 className="text-2xl text-primary-500 font-bold mb-2">Black-Scholes Model</h2>

      {/* No symbol yet */}
      {!symbol && (
        <p className="text-text-secondary">Enter a ticker above.</p>
      )}

      {/* Error */}
      {symbol && error && (
        <p className="text-red-500">{error}</p>
      )}

      {/* Loading */}
      {symbol && !error && !data && (
        <p>Loading…</p>
      )}

      {/* Data display */}
      {data && (
        <>
          <p className="text-xs font-semibold text-text-primary flex items-center">
            {data.symbol}{' '}
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
          <p className="text-4xl font-bold text-text-primary">
            ${data.spot.toFixed(2)}
          </p>
        </>
      )}
    </div>
  );
}
