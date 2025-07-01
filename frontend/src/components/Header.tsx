import React, { useState } from 'react';
import { FaGithub, FaLinkedin, FaSearch } from 'react-icons/fa';
import DarkModeToggle from './DarkModeToggle';

interface HeaderProps {
  onSpotSearch: (symbol: string) => void;
  spotError: string | null;
  onClearError: () => void;
}

export default function Header({ onSpotSearch, spotError, onClearError }: HeaderProps) {
  const [q, setQ] = useState('');

  const submit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && q.trim()) {
      onSpotSearch(q.toUpperCase());
    }
  };

  return (
    <header className="flex items-center px-6 h-16 text-text-primary space-y-1 shadow-none border-none">
      {/* Left: icons + search */}
      <div className="flex items-center space-x-4">
        <a
          href="https://github.com/hemilpatel971/options-pricing-bs"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary-400 transition-colors"
        >
          <FaGithub className="w-6 h-6 text-primary-400" />
        </a>

        <a
          href="https://www.linkedin.com/in/hemilpatel971/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity flex items-center space-x-2"
        >
          <FaLinkedin className="w-6 h-6 text-primary-400" />
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] text-text-secondary">created by</span>
            <span className="font-semibold text-base">Hemil Patel</span>
          </div>
        </a>

        {/* Single search box */}
        <div className="relative w-96">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={submit}
            onFocus={() => { if (spotError) onClearError(); }}
            placeholder="Ticker (e.g. AAPL)"
            className="
              w-full h-10 pl-10 pr-4
              bg-bg-input border border-[#2A2A2A]
              rounded-full
              text-text-primary placeholder:text-text-secondary
              focus:outline-none focus:ring-2 focus:ring-primary-400 transition
            "
          />
        </div>

        {/* Error warning, to the right of the search box */}
        {spotError && (
          <span className="ml-2 text-xs text-red-500 whitespace-nowrap">
            {spotError}
          </span>
        )}
      </div>

      {/* Right: login + toggle */}
      <div className="flex items-center space-x-4 ml-auto">
        <a
          href="/signin"
          className="text-base font-medium hover:text-primary-400 transition-colors"
        >
          Log In
        </a>
        <DarkModeToggle />
      </div>
    </header>
  );
}
