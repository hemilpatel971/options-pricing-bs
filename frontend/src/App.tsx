import React, { useState } from 'react';
import Header from './components/Header';
import SpotPanel from './components/SpotPanel';
import OptionPicker from './components/OptionPicker';

export default function App() {
  const [symbol, setSymbol] = useState<string>('');
  const [spotError, setSpotError] = useState<string | null>(null);

  const onSpotSearch = async (sym: string) => {
    setSpotError(null);
    // validate the ticker before setting it
    const res = await fetch(`/api/bs/spot?ticker=${sym}`);
    if (!res.ok) {
      const e = await res.json();
      setSpotError(e.detail || 'Ticker not found');
      setSymbol('');
    } else {
      setSymbol(sym);
    }
  };

  const onClearError = () => setSpotError(null);

  return (
    <div className="min-h-screen bg-bg-default text-text-primary transition-colors px-8">
      <Header
        onSpotSearch={onSpotSearch}
        spotError={spotError}
        onClearError={onClearError}
      />

      <div className="flex">
        <aside className="w-80 p-6 bg-bg-default">
          <SpotPanel symbol={symbol} />
        </aside>
        <main className="flex-1 p-6">
          {symbol ? (
            <OptionPicker symbol={symbol} />
            ) : (
              <p className="text-text-secondary">Search for a ticker to see its options.</p>
            )}
          {/* other components (OptionControls, calculators, etc.) */}
        </main>
      </div>
    </div>
  );
}
