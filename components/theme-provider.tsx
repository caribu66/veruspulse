'use client';

import React, { useEffect } from 'react';
import { useThemeStore } from '@/lib/store/theme-store';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const initializeTheme = useThemeStore(state => state.initializeTheme);

  useEffect(() => {
    const cleanup = initializeTheme();
    return cleanup;
  }, [initializeTheme]);

  return <>{children}</>;
}
