import React from 'react';
import StockSearch from './components/StockSearch';

const App: React.FC = () => {
  return (
    <div className="p-4">
      <StockSearch />
      {/* Future components: Expirations, OptionChain, BSCalculator */}
    </div>
  );
};

export default App;
