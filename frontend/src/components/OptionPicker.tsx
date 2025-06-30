import React, { useEffect, useState } from 'react';

interface OptionRow {
  contractSymbol: string;
  strike: number;
  bid: number;
  ask: number;
  lastPrice: number;
  inTheMoney: boolean;
}

interface OptionPickerProps {
  symbol: string;
}

export default function OptionPicker({ symbol }: OptionPickerProps) {
  const [spotPrice, setSpotPrice]           = useState<number | null>(null);
  const [expirations, setExpirations]       = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>('');
  const [side, setSide]                     = useState<'call'|'put'>('call');
  const [chain, setChain]                   = useState<OptionRow[]>([]);
  const [selectedOption, setSelectedOption] = useState<OptionRow | null>(null);

  const computeDays = (iso: string) => {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const now = new Date();
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = iso.split('-').map((s, i) =>
      i === 1 ? parseInt(s, 10) - 1 : parseInt(s, 10)
    );
    const expMid = new Date(y, m, d);
    return Math.max(0, Math.round((expMid.getTime() - todayMid.getTime()) / MS_PER_DAY));
  };

  // Fetch spot price
  useEffect(() => {
    if (!symbol) { setSpotPrice(null); return; }
    fetch(`/api/bs/spot?ticker=${symbol}`)
      .then(r => r.json())
      .then(d => setSpotPrice(d.spot))
      .catch(() => setSpotPrice(null));
  }, [symbol]);

  // Fetch expirations
  useEffect(() => {
    if (!symbol) { setExpirations([]); setSelectedExpiry(''); return; }
    fetch(`/api/bs/expirations?ticker=${symbol}`)
      .then(r => r.json())
      .then(d => {
        setExpirations(d.expirations);
        if (d.expirations.length) {
          setSelectedExpiry(d.expirations[0]);
        }
      });
  }, [symbol]);

  // Fetch & trim option chain
  useEffect(() => {
    if (!symbol || !selectedExpiry || spotPrice == null) return;
    fetch(`/api/bs/option_chain?ticker=${symbol}&expiration=${selectedExpiry}`)
      .then(r => r.json())
      .then(d => {
        let rows: OptionRow[] = (side === 'call' ? d.calls : d.puts).map((o: any) => ({
          contractSymbol: o.contractSymbol,
          strike: o.strike,
          bid: o.bid,
          ask: o.ask,
          lastPrice: o.lastPrice,
          inTheMoney: o.inTheMoney,
        }));
        rows.sort((a, b) => a.strike - b.strike);
        const idx = rows.findIndex(r => r.strike >= spotPrice);
        const center = idx >= 0 ? idx : Math.floor(rows.length / 2);
        const start = Math.max(0, center - 4);
        setChain(rows.slice(start, start + 9));
        setSelectedOption(null);
      });
  }, [symbol, selectedExpiry, side, spotPrice]);

  return (
    <div className="space-y-6 p-6 bg-bg-default rounded-lg">
      <h2 className="text-xs font-extralight mb-3">Data is delayed by 15 min (using yfinance API)</h2>
      <div className="flex items-center space-x-6">
        {/* Call/Put toggle */}
        <div className="inline-flex overflow-hidden rounded-md border border-green-500">
          {['call','put'].map(s => (
            <button
              key={s}
              onClick={() => setSide(s as 'call'|'put')}
              className={`px-6 py-2 font-semibold ${
                side === s ? 'bg-green-500 text-black' : 'bg-transparent text-green-500 hover:bg-green-600/20'
              }`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Expiration selector */}
        <select
          value={selectedExpiry}
          onChange={e => setSelectedExpiry(e.target.value)}
          className="
          h-10          
          px-4 
          bg-bg-input 
          border border-[#2A2A2A] 
          rounded-md 
          text-text-primary
        "
        >
          {expirations.map(iso => {
          const [y, m, d] = iso.split('-').map((s, i) =>
            i === 1 ? parseInt(s, 10) - 1 : parseInt(s, 10)
          );
          const dt = new Date(y, m, d);
          const days = computeDays(iso);
          return (
            <option key={iso} value={iso}>
              {dt.toLocaleDateString('en-US', {
                month: 'short',
                day:   'numeric',
                year:  'numeric',
              })} ({days}d)
            </option>
          );
        })}
        </select>
      </div>

      {/* Scrollable table */}
      <div className="overflow-y-auto max-h-64 scrollbar-none">
        <table className="w-full table-fixed text-left">
          <thead className="sticky top-0 bg-bg-default">
            <tr className="border-b border-[#2A2A2A]">
              {[
                { key: 'strike', label: 'Strike', width: '15%' },
                { key: 'last',   label: 'Last',   width: '15%' },
                { key: 'bid',    label: 'Bid',    width: '15%' },
                { key: 'ask',    label: 'Ask',    width: '15%' },
                { key: 'itm',    label: 'In The Money', width: '20%' },
                { key: 'sel',    label: 'Select', width: '20%' },
              ].map(col => (
                <th
                  key={col.key}
                  className="pb-2 text-sm font-medium"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chain.map(r => {
              const isSel = selectedOption?.contractSymbol === r.contractSymbol;
              return (
                <tr key={r.contractSymbol} className="hover:bg-bg-input">
                  <td className="py-2">${r.strike.toFixed(2)}</td>
                  <td className="py-2">${r.lastPrice.toFixed(2)}</td>
                  <td className="py-2">${r.bid.toFixed(2)}</td>
                  <td className="py-2">${r.ask.toFixed(2)}</td>
                  <td className="py-2">
                    {r.inTheMoney
                      ? <span className="text-green-500 font-bold">✔</span>
                      : <span className="text-text-secondary">—</span>}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => setSelectedOption(r)}
                      className={`px-3 py-1 rounded ${
                        isSel
                          ? 'bg-green-500 text-black'
                          : 'bg-transparent border border-green-500 text-green-500 hover:bg-green-600/20'
                      }`}
                    >
                      {isSel ? '✓' : 'Select'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Share price below */}
      {spotPrice != null && (
        <div className="flex justify-center">
          <div className="bg-green-500 rounded-full px-6 py-2 text-black font-semibold">
            Share price: ${spotPrice.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}
