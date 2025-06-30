import React from 'react';
import Header from './components/Header';
import BlackScholesPanel from './components/BlackScholesPanel';

const App: React.FC = () => (
  <div className="min-h-screen bg-bg-default text-text-primary">
    <Header />

    <div className="flex">
      {/* Sidebar: 20rem wide, fixed from below header, full viewport height, no scrollbars */}
      <aside
        className="
          fixed top-16 bottom-0 left-0   /* span from header bottom to viewport bottom */
          w-80                            /* 20rem */
          bg-bg-panel text-text-primary
          p-6
          border-r border-[#2A2A2A]
          overflow-hidden                 /* hide any internal scrollbars */
        "
      >
        <BlackScholesPanel />
      </aside>

      {/* Main content flows alongside */}
      <main className="ml-80 flex-1 p-6">
        {/* Your other components go here */}
      </main>
    </div>
  </div>
);

export default App;
