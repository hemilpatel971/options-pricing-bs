import React, { useState } from 'react';
import Header from './components/Header';
import SpotPanel from './components/SpotPanel';
import OptionPicker from './components/OptionPicker';

export interface BSInputs {
  spot:          number;
  strike:        number;
  days:          number;
  volatility:    number;
  rate:          number;
  dividendYield: number;
}

export default function App() {
  const [symbol, setSymbol] = useState<string>('');
  const [bsInputs, setBsInputs] = useState<BSInputs | null>(null);
  const [bsResults, setBsResults] = useState<{ call: number; put: number } | null>(null);

  const handleCalculate = (inputs: BSInputs) => {
    setBsInputs(inputs);
    fetch('/api/bs/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spot: inputs.spot,
        strike: inputs.strike,
        expiration: new Date(Date.now() + inputs.days * 86400000).toISOString().slice(0,10),
        rate: inputs.rate / 100,
        volatility: inputs.volatility / 100,
        dividend_yield: inputs.dividendYield / 100,
      }),
    })
      .then(r => r.json())
      .then(res => {
        setBsResults({ call: res.call_price, put: res.put_price });
      })
      .catch(console.error);
  };

  return (
    <div className="min-h-screen bg-bg-default text-text-primary">
      <Header onSpotSearch={setSymbol} />

      <div className="flex">
        <aside className="w-80 p-6">
          <SpotPanel
            symbol={symbol}
            bsInputs={bsInputs ?? undefined}
            callPrice={bsResults?.call}
            putPrice={bsResults?.put}
          />
        </aside>

        <main className="flex-1 p-6">
          <OptionPicker
            symbol={symbol || undefined}
            onCalculate={handleCalculate}
          />
        </main>
      </div>
    </div>
  );
}
