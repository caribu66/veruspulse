'use client';

// Theme context stub - Dark theme only
// Kept for backward compatibility with existing imports

import React, { createContext, useContext } from 'react';

interface ThemeContextType {
  theme: 'dark';
  resolvedTheme: 'dark';
  setTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value: ThemeContextType = {
    theme: 'dark',
    resolvedTheme: 'dark',
    setTheme: () => {}, // No-op
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default if context is not available (SSR)
    return {
      theme: 'dark' as const,
      resolvedTheme: 'dark' as const,
      setTheme: () => {},
    };
  }
  return context;
}
