'use client';

// Theme context stub - Dark theme only
// Kept for backward compatibility with existing imports

import React from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always dark theme - no switching
  return <>{children}</>;
}

export function useTheme() {
  // Return dark theme always
  return {
    theme: 'dark' as const,
    resolvedTheme: 'dark' as const,
    setTheme: () => {}, // No-op
  };
}
