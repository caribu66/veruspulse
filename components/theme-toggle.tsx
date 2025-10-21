'use client';

import { Sun, Moon } from '@phosphor-icons/react';
import { useTheme } from '@/contexts/theme-context';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ThemeToggle({
  className = '',
  size = 'md',
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative overflow-hidden rounded-lg border transition-all duration-300 ease-in-out
        hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50
        ${sizeClasses[size]}
        ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 hover:border-slate-500'
            : 'bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-300 hover:border-yellow-200'
        }
        ${className}
      `}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {/* Background Animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

      {/* Icon Container */}
      <div className="relative flex items-center justify-center h-full w-full">
        <div className="relative">
          {/* Sun Icon */}
          <Sun
            className={`
              absolute inset-0 transition-all duration-500 ease-in-out
              ${iconSizes[size]}
              ${
                theme === 'dark'
                  ? 'rotate-0 scale-100 opacity-100 text-yellow-300'
                  : 'rotate-180 scale-0 opacity-0'
              }
            `}
          />

          {/* Moon Icon */}
          <Moon
            className={`
              absolute inset-0 transition-all duration-500 ease-in-out
              ${iconSizes[size]}
              ${
                theme === 'light'
                  ? 'rotate-0 scale-100 opacity-100 text-slate-700'
                  : 'rotate-180 scale-0 opacity-0'
              }
            `}
          />
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium whitespace-nowrap">
          {theme === 'dark' ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}

// Compact version for navigation bars
export function ThemeToggleCompact({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  // Safety check for hydration
  if (!theme) {
    return (
      <div
        className={`p-2 rounded-lg bg-slate-800 border border-slate-700 ${className}`}
      >
        <div className="h-5 w-5" />
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative p-2 rounded-lg transition-all duration-300 ease-in-out
        hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50
        ${
          theme === 'dark'
            ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600'
            : 'bg-white hover:bg-gray-50 border border-slate-300 hover:border-gray-300'
        }
        ${className}
      `}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      <div className="relative h-5 w-5">
        <Sun
          className={`
            absolute inset-0 transition-all duration-500 ease-in-out
            ${
              theme === 'dark'
                ? 'rotate-0 scale-100 opacity-100 text-yellow-400'
                : 'rotate-180 scale-0 opacity-0'
            }
          `}
        />
        <Moon
          className={`
            absolute inset-0 transition-all duration-500 ease-in-out
            ${
              theme === 'light'
                ? 'rotate-0 scale-100 opacity-100 text-slate-600'
                : 'rotate-180 scale-0 opacity-0'
            }
          `}
        />
      </div>
    </button>
  );
}
