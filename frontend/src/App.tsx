// src/App.tsx
import React from 'react';
import Header from './components/Header';
import StockSearch from './components/StockSearch';

const App: React.FC = () => (
  <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
    <Header />

    <main className="p-6 flex">
      {/* Left column: StockSearch */}
      <div className="w-1/2">
        <StockSearch />
      </div>
      {/* Right column: you can put other components here */}
      <div className="w-1/2 pl-6">
        {/* e.g. <Expirations /> */}
      </div>
    </main>
  </div>
);

export default App;
