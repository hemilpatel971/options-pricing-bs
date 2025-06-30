import React from 'react';
import { FaLinkedin, FaGithub } from 'react-icons/fa';
import DarkModeToggle from './DarkModeToggle';

const Header: React.FC = () => {
  return (
    <header
      className="
        h-16                      /* fixed height so sidebar can offset from it */
        w-full
        bg-neutral-50 text-neutral-900
        dark:bg-neutral-900 dark:text-text-primary
        shadow-md
      "
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-full px-4">
        {/* Left: GitHub + LinkedIn + Name */}
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/YOUR_REPO"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-400 dark:hover:text-primary-300 transition-colors"
          >
            <FaGithub className="w-6 h-6 text-primary-400 dark:text-primary-300" />
          </a>
          <a
            href="https://www.linkedin.com/in/hemilpatel971/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <FaLinkedin className="w-6 h-6 text-primary-400 dark:text-primary-300" />
            <span className="font-semibold text-lg">Hemil Patel</span>
          </a>
        </div>

        {/* Right: Log In + Theme Switch */}
        <div className="flex items-center space-x-4">
          <a
            href="/signin"
            className="
              text-base font-medium
              hover:text-primary-400 dark:hover:text-primary-300
              transition-colors
            "
          >
            Log In
          </a>
          <DarkModeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
