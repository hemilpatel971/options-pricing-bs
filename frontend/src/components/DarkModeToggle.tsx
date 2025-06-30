import React, { useEffect, useState } from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';

const DarkModeToggle: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved === 'dark' || (!saved && prefers);
    document.documentElement.classList.toggle('dark', dark);
    setIsDarkMode(dark);
  }, []);

  // Toggle handler
  const toggleDarkMode = () => {
    const next = !isDarkMode;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setIsDarkMode(next);
  };

  return (
    <button
      onClick={toggleDarkMode}
      role="switch"
      aria-checked={isDarkMode}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`
        relative inline-flex items-center h-6 w-12 cursor-pointer rounded-full
        focus:outline-none focus:ring-2 focus:ring-primary-500
        ${isDarkMode ? 'bg-primary-400' : 'bg-neutral-300'}
      `}
    >
      {/* Sun icon on left */}
      <FaSun
        className="
          absolute left-1 h-4 w-4
          text-neutral-900 dark:text-neutral-100
        "
      />

      {/* Moon icon on right */}
      <FaMoon
        className="
          absolute right-1 h-4 w-4
          text-neutral-900 dark:text-neutral-100
        "
      />

      {/* Thumb */}
      <span
        className={`
          absolute top-0.5 h-5 w-5 bg-white rounded-full shadow
          ${isDarkMode ? 'right-1' : 'left-1'}
        `}
      />
    </button>
  );
};

export default DarkModeToggle;
