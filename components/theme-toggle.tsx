'use client';

import React from 'react';
import { Sun, Moon, Monitor, Contrast } from 'lucide-react';
import {
  useTheme,
  useHighContrast,
  useThemeActions,
} from '@/lib/store/theme-store';

export function ThemeToggle() {
  const theme = useTheme();
  const highContrast = useHighContrast();
  const { setTheme, setHighContrast } = useThemeActions();

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'auto':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Sun className="h-4 w-4" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light theme';
      case 'dark':
        return 'Dark theme';
      case 'auto':
        return 'Auto theme';
      default:
        return 'Theme';
    }
  };

  const cycleTheme = () => {
    const themes = ['dark', 'light', 'auto'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Theme Toggle - Icon Only for Better Space Management */}
      <button
        onClick={cycleTheme}
        className="flex items-center justify-center w-8 h-8 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        aria-label={`Current theme: ${getThemeLabel()}. Click to cycle themes.`}
        title={`Current: ${getThemeLabel()}`}
      >
        {getThemeIcon()}
      </button>

      {/* High Contrast Toggle - Icon Only for Better Space Management */}
      <button
        onClick={() => setHighContrast(!highContrast)}
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
          highContrast
            ? 'text-yellow-400 hover:text-yellow-300 bg-yellow-400/10'
            : 'text-white/80 hover:text-white hover:bg-white/10'
        }`}
        aria-label={`High contrast mode: ${highContrast ? 'enabled' : 'disabled'}. Click to toggle.`}
        title={`High contrast: ${highContrast ? 'On' : 'Off'}`}
      >
        <Contrast className="h-4 w-4" />
      </button>
    </div>
  );
}
