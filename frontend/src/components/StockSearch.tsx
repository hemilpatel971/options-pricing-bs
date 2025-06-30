// src/components/StockSearch.tsx
import React, { useState } from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa';

interface SpotResponse {
  spot: number;
}

const StockSearch: React.FC = () => {
  const [symbol, setSymbol] = useState<string>('');
  const [spot, setSpot] = useState<number | null>(null);
  const [inputPrice, setInputPrice] = useState<string>(''); 
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/bs/spot?ticker=${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data: SpotResponse = await res.json();
      setSpot(data.spot);
      setInputPrice(data.spot.toFixed(2));
    } catch (err: any) {
      setError(err.message);
      setSpot(null);
      setInputPrice('');
    }
  };

  const updatePrice = (delta: number) => {
    let current = parseFloat(inputPrice);
    if (isNaN(current)) current = 0;
    const next = Math.max(0, current + delta);
    setInputPrice(next.toFixed(2));
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // allow empty or up to two decimals
    if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) {
      setInputPrice(v);
    }
  };

  return (
    <div className="
      p-6 max-w-md
      bg-neutral-50 text-neutral-900
      dark:bg-neutral-800 dark:text-neutral-100
      rounded-2xl shadow-md
    ">
      <h2 className="text-2xl font-bold mb-4">Stock Search</h2>

      <div className="flex mb-4">
        <input
          type="text"
          inputMode="decimal"
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          placeholder="Ticker symbol (e.g. AAPL)"
          className="
            flex-grow px-4 py-2
            border border-neutral-300 dark:border-neutral-600
            bg-neutral-100 dark:bg-neutral-700
            text-neutral-900 dark:text-neutral-100
            rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-400
          "
        />
        <button
          onClick={handleSearch}
          className="
            ml-3 px-5 py-2
            bg-primary-400 hover:bg-primary-300
            dark:bg-primary-500 dark:hover:bg-primary-400
            text-neutral-900 dark:text-neutral-50
            font-semibold rounded-lg
          "
        >
          Search
        </button>
      </div>

      {error && (
        <p className="mb-2 text-sm font-medium text-neon dark:text-neon/80">
          Error: {error}
        </p>
      )}

      <form className="mt-4 space-y-2">
        <label className="block text-sm font-medium">Current Spot Price</label>
        <div className="flex items-center space-x-2">
          
          <input
            type="text"
            inputMode="decimal"
            pattern="^\d*\.?\d{0,2}$"
            value={inputPrice}
            onChange={onInputChange}
            placeholder="0.00"
            className="
              w-24 text-center
              px-2 py-1
              border border-neutral-300 dark:border-neutral-600
              bg-neutral-100 dark:bg-neutral-700
              text-neutral-900 dark:text-neutral-100
              rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-400
            "
          />
          <button
            type="button"
            onClick={() => updatePrice(-0.01)}
            className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600"
          >
            <FaMinus className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
          </button>
          <button
            type="button"
            onClick={() => updatePrice(0.01)}
            className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600"
          >
            <FaPlus className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockSearch;
