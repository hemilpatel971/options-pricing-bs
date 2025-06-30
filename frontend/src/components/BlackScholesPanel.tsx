import React, { useState } from 'react';
import { FaPlus, FaMinus, FaQuestionCircle } from 'react-icons/fa';


interface SpotResponse { spot: number; }
interface ExpirationsResponse { expirations: string[] }

export default function BlackScholesPanel() {
  const [symbol, setSymbol] = useState<string>('');
  const [spotPrice, setSpotPrice] = useState<string>('');
  const [spotError, setSpotError] = useState<string | null>(null);
  const [strike, setStrike] = useState<number>(0);

  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [expirationError, setExpirationError] = useState<string | null>(null);

  const [timeToExpiry, setTimeToExpiry] = useState<string>('');
  const [volatility, setVolatility] = useState<string>('');
  const [riskFreeRate, setRiskFreeRate] = useState<string>('');
  const [dividendYield, setDividendYield] = useState<string>('');

  // Helper to compute local calendar‐day difference
  const computeDays = (isoDate: string): number => {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    // 1) Today at local midnight
    const now = new Date();
    const todayLocalMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // 2) Expiration at local midnight (parse ISO manually)
    const [y, m, d] = isoDate.split('-').map(s => parseInt(s, 10));
    const expLocalMidnight = new Date(y, m - 1, d);

    // 3) Difference in ms → days
    const diffMs = expLocalMidnight.getTime() - todayLocalMidnight.getTime();
    const diffDays = Math.round(diffMs / MS_PER_DAY);

    return Math.max(0, diffDays);
  };

  // Fetch spot and expirations
  const handleSpotSearch = async () => {
    setSpotError(null);
    setExpirationError(null);
    try {
      // 1) Spot price
      const resSpot = await fetch(`/api/bs/spot?ticker=${encodeURIComponent(symbol)}`);
      if (!resSpot.ok) {
        const err = await resSpot.json();
        throw new Error(err.detail || 'Unknown ticker or no price data');
      }
      const { spot }: SpotResponse = await resSpot.json();
      setSpotPrice(spot.toFixed(2));

      // 2) Expirations
      const resExp = await fetch(`/api/bs/expirations?ticker=${encodeURIComponent(symbol)}`);
      if (!resExp.ok) {
        const err = await resExp.json();
        throw new Error(err.detail || 'Could not fetch expirations');
      }
      const { expirations }: ExpirationsResponse = await resExp.json();
      setExpirations(expirations);

      // select first expiration by default
      if (expirations.length > 0) {
        setSelectedExpiration(expirations[0]);
        setTimeToExpiry(String(computeDays(expirations[0])));
      }
    } catch (err: any) {
      setSpotPrice('');
      setExpirations([]);
      setSelectedExpiration('');
      setTimeToExpiry('');
      setSpotError(err.message);
    }
  };

  // Handle expiration selection
  const handleExpirationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const iso = e.target.value;
    setSelectedExpiration(iso);
    setTimeToExpiry(String(computeDays(iso)));
  };

  // bump a string-backed number by delta, clamp ≥0, format to `dec` decimals
  const bump = (value: string, delta: number, dec: number) => {
    let cur = parseFloat(value);
    if (isNaN(cur)) cur = 0;
    const next = Math.max(0, cur + delta);
    return next.toFixed(dec);
  };

  // helper for free-form typing: allow empty or match `regex`
  const onChangeStr = (
    raw: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    regex: RegExp
  ) => {
    if (raw === '' || regex.test(raw)) setter(raw);
  };

  return (
    <div className="h-full space-y-6">
      {/* Title */}
      <h2 className="text-2xl font-bold leading-tight">
        Black-Scholes Model
      </h2>

      {/* Ticker Symbol */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-text-primary">
          TICKER SYMBOL
        </label>
        <div className="flex">
          <input
            type="text"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder="AAPL"
            className="w-40 h-10 px-3 bg-bg-input border border-[#2A2A2A]
                       text-text-primary placeholder:text-text-secondary rounded-md"
          />
          <button
            onClick={handleSpotSearch}
            className="ml-2 h-10 px-4 bg-primary-400 hover:bg-primary-300
                       text-bg-panel font-semibold text-sm rounded-md"
          >
            Search
          </button>
        </div>
        {spotError && <p className="text-xs text-red-500 mt-1">{spotError}</p>}
      </div>

      {/* Current Stock Price */}
      <div className="space-y-1">
        <label className="flex items-center text-xs font-semibold text-text-primary">
          CURRENT STOCK PRICE
          <FaQuestionCircle
            className="ml-1 w-4 h-4 text-text-secondary cursor-pointer"
            onClick={() =>
              alert('Data is delayed up to 15 minutes (using Yahoo Finance API)')
            }
          />
        </label>
        <div className="relative w-40">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-primary">
            $
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={spotPrice}
            onChange={e =>
              onChangeStr(e.target.value, setSpotPrice, /^\d*\.?\d{0,2}$/)
            }
            placeholder="0.00"
            className="w-full h-10 text-left bg-bg-input border border-[#2A2A2A]
                       text-text-primary placeholder:text-text-secondary rounded-md pl-8"
          />
        </div>
      </div>

      {/* Separator Line */}
      <hr className="border-t border-[#2A2A2A] my-4" />

      {/* Expiration Date */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-text-primary">
          EXPIRATION DATE
        </label>
        <select
          value={selectedExpiration}
          onChange={handleExpirationChange}
          disabled={!expirations.length}
          className="w-40 h-10 px-3 bg-bg-input border border-[#2A2A2A] text-text-primary rounded-md"
        >
          {expirations.map(iso => {
            // parse as local midnight
            const [y, m, d] = iso.split('-').map(s => parseInt(s, 10));
            const dt = new Date(y, m - 1, d);
            const label = dt.toLocaleDateString('en-US', {
              month: 'long',
              day:   'numeric',
              year:  'numeric',
            });
            return (
              <option key={iso} value={iso}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      {/* Time to Expiry (days) */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-text-primary">
          TIME TO EXPIRY (DAYS)
        </label>
        <div className="flex items-center">
          <input
            type="text"
            inputMode="numeric"
            value={timeToExpiry}
            placeholder="0"
            readOnly
            className="w-40 h-10 px-3 bg-bg-input border border-[#2A2A2A]
                       text-text-primary rounded-md"
          />
        </div>
      </div>

      {/* Volatility (%) */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-text-primary">
          VOLATILITY (%)
        </label>
        <div className="flex items-center">
          <input
            type="text"
            inputMode="decimal"
            value={volatility}
            onChange={e =>
              onChangeStr(e.target.value, setVolatility, /^\d*\.?\d{0,2}$/)
            }
            placeholder="0.00"
            className="w-40 h-10 px-3 bg-bg-input border border-[#2A2A2A]
                       text-text-primary placeholder:text-text-secondary rounded-md"
          />
          <button
            onClick={() => setVolatility(bump(volatility, -0.01, 2))}
            className="ml-2 w-8 h-8 bg-bg-input rounded-md flex items-center justify-center"
          >
            <FaMinus className="w-4 h-4 text-text-primary" />
          </button>
          <button
            onClick={() => setVolatility(bump(volatility, +0.01, 2))}
            className="ml-2 w-8 h-8 bg-bg-input rounded-md flex items-center justify-center"
          >
            <FaPlus className="w-4 h-4 text-text-primary" />
          </button>
        </div>
      </div>

      {/* Risk-Free Rate (%) */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-text-primary">
          RISK-FREE RATE (%)
        </label>
        <div className="flex items-center">
          <input
            type="text"
            inputMode="decimal"
            value={riskFreeRate}
            onChange={e =>
              onChangeStr(e.target.value, setRiskFreeRate, /^\d*\.?\d{0,2}$/)
            }
            placeholder="0.00"
            className="w-40 h-10 px-3 bg-bg-input border border-[#2A2A2A]
                       text-text-primary placeholder:text-text-secondary rounded-md"
          />
          <button
            onClick={() => setRiskFreeRate(bump(riskFreeRate, -0.01, 2))}
            className="ml-2 w-8 h-8 bg-bg-input rounded-md flex items-center justify-center"
          >
            <FaMinus className="w-4 h-4 text-text-primary" />
          </button>
          <button
            onClick={() => setRiskFreeRate(bump(riskFreeRate, +0.01, 2))}
            className="ml-2 w-8 h-8 bg-bg-input rounded-md flex items-center justify-center"
          >
            <FaPlus className="w-4 h-4 text-text-primary" />
          </button>
        </div>
      </div>

      {/* Dividend Yield (%) */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-text-primary">
          DIVIDEND YIELD (%)
        </label>
        <div className="flex items-center">
          <input
            type="text"
            inputMode="decimal"
            value={dividendYield}
            onChange={e =>
              onChangeStr(e.target.value, setDividendYield, /^\d*\.?\d{0,2}$/)
            }
            placeholder="0.00"
            className="w-40 h-10 px-3 bg-bg-input border border-[#2A2A2A]
                       text-text-primary placeholder:text-text-secondary rounded-md"
          />
          <button
            onClick={() => setDividendYield(bump(dividendYield, -0.01, 2))}
            className="ml-2 w-8 h-8 bg-bg-input rounded-md flex items-center justify-center"
          >
            <FaMinus className="w-4 h-4 text-text-primary" />
          </button>
          <button
            onClick={() => setDividendYield(bump(dividendYield, +0.01, 2))}
            className="ml-2 w-8 h-8 bg-bg-input rounded-md flex items-center justify-center"
          >
            <FaPlus className="w-4 h-4 text-text-primary" />
          </button>
        </div>
      </div>

      {/* Calculate */}
      <button
        type="button"
        className="w-full h-12 bg-primary-400 hover:bg-primary-300 text-bg-panel font-semibold text-lg rounded-md"
      >
        Calculate
      </button>
    </div>
  );
}
