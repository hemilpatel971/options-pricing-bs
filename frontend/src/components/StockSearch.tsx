import React, { useState } from 'react';

interface SpotResponse {
  spot: number;
}

const StockSearch: React.FC = () => {
  const [symbol, setSymbol] = useState<string>('');
  const [spot, setSpot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/bs/spot?ticker=${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data: SpotResponse = await res.json();
      setSpot(data.spot);
    } catch (err: any) {
      setError(err.message);
      setSpot(null);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-2">Stock Search</h2>
      <div className="flex mb-4">
        <input
          type="text"
          value={symbol}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSymbol(e.target.value)}
          placeholder="Ticker symbol (e.g. AAPL)"
          className="border rounded p-2 flex-grow mr-2"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white rounded px-4"
        >
          Search
        </button>
      </div>
      {error && <p className="text-red-500">Error: {error}</p>}
      {spot !== null && !error && (
        <p className="text-green-700">Current Spot Price: ${spot.toFixed(2)}</p>
      )}
    </div>
  );
};

export default StockSearch;
