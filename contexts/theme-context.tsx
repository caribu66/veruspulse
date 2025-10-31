'use client';

import React, { createContext, useContext, useEffect } from 'react';

type Theme = 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void; // Keep for compatibility but does nothing
  setTheme: (theme: Theme) => void; // Keep for compatibility but does nothing
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always use dark theme
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  // No-op functions for compatibility
  const toggleTheme = () => {
    // Dark theme only - no toggling
  };

  const setTheme = () => {
    // Dark theme only - ignore set theme calls
  };

  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme, setTheme }}>
      <div className="dark">{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
