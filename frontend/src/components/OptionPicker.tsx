import React, { useEffect, useState } from 'react';
import { BSInputs } from '../App';

interface OptionRow {
  contractSymbol: string;
  strike: number;
  bid: number;
  ask: number;
  lastPrice: number;
  inTheMoney: boolean;
}

interface OptionPickerProps {
  symbol?: string;
  onCalculate: (inputs: BSInputs) => void;
}

export default function OptionPicker({
  symbol,
  onCalculate
}: OptionPickerProps) {
  // BS-model inputs with defaults
  const [spotStr, setSpotStr]           = useState('100.00');
  const [strikeStr, setStrikeStr]       = useState('100.00');
  const [volatility, setVolatility]     = useState('20.00');
  const [riskFreeRate, setRiskFreeRate] = useState('0.0525');
  const [dividendYield, setDividendYield] = useState('0.00');
  const [daysStr, setDaysStr]           = useState('365');

  // option chain state
  const [expirations, setExpirations]       = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const [side, setSide]                     = useState<'call'|'put'>('call');
  const [chain, setChain]                   = useState<OptionRow[]>([]);
  const [selectedOption, setSelectedOption] = useState<OptionRow|null>(null);

  // compute days until an ISO date
  const computeDays = (iso: string) => {
    const MS = 1000*60*60*24;
    const [y,m,d] = iso.split('-').map((s,i)=> i===1?parseInt(s,10)-1:parseInt(s,10));
    const exp = new Date(y,m,d);
    const now = new Date();
    const today = new Date(now.getFullYear(),now.getMonth(),now.getDate());
    return Math.max(0, Math.round((exp.getTime()-today.getTime())/MS));
  };

  // when user selects an option row
  useEffect(() => {
    if (selectedOption) {
      setStrikeStr(selectedOption.strike.toFixed(2));
      setDaysStr(String(computeDays(selectedExpiry)));
    }
  }, [selectedOption, selectedExpiry]);

  // on new symbol, fetch spot & expirations
  useEffect(() => {
    if (!symbol) return;
    fetch(`/api/bs/spot?ticker=${symbol}`)
      .then(r=>r.json())
      .then(d=> setSpotStr(d.spot.toFixed(2)))
      .catch(()=>{});

    fetch(`/api/bs/expirations?ticker=${symbol}`)
      .then(r=>r.json())
      .then(d=>{
        setExpirations(d.expirations);
        if (d.expirations.length) {
          const first = d.expirations[0];
          setSelectedExpiry(first);
          setDaysStr(String(computeDays(first)));
        }
      });
  }, [symbol]);

  // fetch & slice the option chain
  useEffect(() => {
    const sp = parseFloat(spotStr)||0;
    if (!symbol||!selectedExpiry) return;
    fetch(`/api/bs/option_chain?ticker=${symbol}&expiration=${selectedExpiry}`)
      .then(r=>r.json())
      .then(d=>{
        const rows: OptionRow[] = (side==='call'?d.calls:d.puts)
          .map((o:any)=>({
            contractSymbol:o.contractSymbol,
            strike:o.strike,
            bid:o.bid,
            ask:o.ask,
            lastPrice:o.lastPrice,
            inTheMoney:o.inTheMoney
          }))
          .sort((a,b)=>b.strike-a.strike);

        const idx = rows.findIndex(r=>r.strike<=sp);
        const center = idx>=0?idx:Math.floor(rows.length/2);
        const start  = Math.max(0, center-4);
        setChain(rows.slice(start, start+9));
      });
  }, [symbol, selectedExpiry, side, spotStr]);

  // fire calculation back to App
  const handleCalculate = () => {
    onCalculate({
      spot:         parseFloat(spotStr),
      strike:       parseFloat(strikeStr),
      days:         parseInt(daysStr)||0,
      volatility:   parseFloat(volatility),
      rate:         parseFloat(riskFreeRate)*100,
      dividendYield:parseFloat(dividendYield),
    });
  };

  return (
    <div className="space-y-6 p-6 bg-bg-default rounded-lg">
      {/* BS-model inputs, single condensed row */}
      <div className="flex flex-wrap items-end gap-4">
        {[
          { label:'Spot Price ($)',    value:spotStr,       setter:setSpotStr    },
          { label:'Strike Price ($)',  value:strikeStr,     setter:setStrikeStr  },
          { label:'Time to Expiry',    value:daysStr,       setter:setDaysStr    },
          { label:'Volatility (%)',    value:volatility,    setter:setVolatility },
          { label:'Risk-Free Rate (%)',value:riskFreeRate,   setter:setRiskFreeRate },
          { label:'Dividend Yield (%)',value:dividendYield,  setter:setDividendYield },
        ].map((f,i)=>(
          <div key={i} className="flex flex-col flex-1 min-w-[130px]">
            <label className="text-xs font-semibold mb-1">{f.label}</label>
            <input
              inputMode="decimal"
              value={f.value}
              onChange={e=>{
                const v=e.target.value;
                if(/^\d*\.?\d{0,2}$/.test(v)) f.setter(v);
              }}
              className="w-full h-8 px-2 bg-white dark:bg-black border rounded text-sm"
            />
          </div>
        ))}
        <button
          onClick={handleCalculate}
          className="h-8 px-4 bg-primary-400 hover:bg-primary-300 text-black font-semibold rounded text-sm"
        >
          Calculate
        </button>
      </div>

      {/* Option controls & table */}
      <div className="pt-6 border-t border-[#2A2A2A] space-y-4">
        {/* call/put + expiration */}
        <div className="flex items-center space-x-6">
          <div className="inline-flex overflow-hidden rounded-md border border-green-500">
            {['call','put'].map(s=>(
              <button
                key={s}
                onClick={()=>setSide(s as 'call'|'put')}
                className={`px-6 py-2 font-semibold ${
                  side===s
                   ? 'bg-green-500 text-black'
                   : 'bg-transparent text-green-500 hover:bg-green-600/20'
                }`}
              >{s.toUpperCase()}</button>
            ))}
          </div>
          <select
            value={selectedExpiry}
            onChange={e=>{
              setSelectedExpiry(e.target.value);
              setDaysStr(String(computeDays(e.target.value)));
            }}
            className="h-10 px-4 bg-bg-input border border-[#2A2A2A] rounded-md text-text-primary text-sm"
          >
            {expirations.map(iso=>{
              const [y,m,d]=iso.split('-').map((s,i)=>i===1?parseInt(s,10)-1:parseInt(s,10));
              const dt=new Date(y,m,d), days=computeDays(iso);
              return <option key={iso} value={iso} className="text-sm">
                {dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} ({days}d)
              </option>;
            })}
          </select>
        </div>

        {/* option table */}
        <div className="overflow-y-auto max-h-64 scrollbar-none">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="sticky top-0 bg-bg-default">
              <tr className="border-b border-[#2A2A2A]">
                {['Strike','Last','Bid','Ask','In The Money','Select'].map((h,i)=>(
                  <th key={i} className="pb-2 font-medium text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chain.map(r=>{
                const isSel = selectedOption?.contractSymbol===r.contractSymbol;
                return (
                  <tr key={r.contractSymbol} className="hover:bg-bg-input">
                    {[
                      `\$${r.strike.toFixed(2)}`,
                      `\$${r.lastPrice.toFixed(2)}`,
                      `\$${r.bid.toFixed(2)}`,
                      `\$${r.ask.toFixed(2)}`,
                      r.inTheMoney
                        ? <span className="text-green-500 font-bold">✔</span>
                        : <span className="text-text-secondary">–</span>
                    ].map((cell,idx)=>(
                      <td key={idx} className="py-1 text-center">{cell}</td>
                    ))}
                    <td className="py-1 text-center">
                      <button
                        onClick={()=>setSelectedOption(r)}
                        className={`px-2 py-0.5 rounded text-sm ${
                          isSel
                           ? 'bg-green-500 text-black'
                           : 'bg-transparent border border-green-500 text-green-500 hover:bg-green-600/20'
                        }`}
                      >{isSel?'✓':'Select'}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
