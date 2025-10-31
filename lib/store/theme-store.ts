'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type Theme = 'dark';

export interface ThemeState {
  theme: Theme;
  systemTheme: 'dark';
  effectiveTheme: 'dark';
  highContrast: boolean;
  reducedMotion: boolean;

  setTheme: (theme: Theme) => void; // No-op for compatibility
  setHighContrast: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  toggleTheme: () => void; // No-op for compatibility
  initializeTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set, get) => ({
        theme: 'dark',
        systemTheme: 'dark',
        effectiveTheme: 'dark',
        highContrast: false,
        reducedMotion: false,

        setTheme: () => {
          // Always dark theme - no-op for compatibility
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute(
              'data-high-contrast',
              get().highContrast.toString()
            );
            document.documentElement.setAttribute(
              'data-reduced-motion',
              get().reducedMotion.toString()
            );
          }
        },

        setHighContrast: enabled => {
          set({ highContrast: enabled }, false, 'setHighContrast');
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute(
              'data-high-contrast',
              enabled.toString()
            );
          }
        },

        setReducedMotion: enabled => {
          set({ reducedMotion: enabled }, false, 'setReducedMotion');
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute(
              'data-reduced-motion',
              enabled.toString()
            );
          }
        },

        toggleTheme: () => {
          // Always dark theme - no-op for compatibility
        },

        initializeTheme: () => {
          // Check if we're in the browser
          if (
            typeof window === 'undefined' ||
            typeof document === 'undefined'
          ) {
            return () => {}; // Return empty cleanup function for SSR
          }

          // Detect reduced motion preference
          const reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
          ).matches;

          set(
            {
              systemTheme: 'dark',
              effectiveTheme: 'dark',
              reducedMotion,
            },
            false,
            'initializeTheme'
          );

          // Apply initial theme - always dark
          document.documentElement.setAttribute('data-theme', 'dark');
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute(
            'data-high-contrast',
            get().highContrast.toString()
          );
          document.documentElement.setAttribute(
            'data-reduced-motion',
            reducedMotion.toString()
          );

          // Listen for reduced motion changes
          const motionQuery = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
          );
          const handleMotionChange = (e: MediaQueryListEvent) => {
            get().setReducedMotion(e.matches);
          };

          motionQuery.addEventListener('change', handleMotionChange);

          // Return cleanup function
          return () => {
            motionQuery.removeEventListener('change', handleMotionChange);
          };
        },
      }),
      {
        name: 'verus-theme-store',
        partialize: state => ({
          theme: state.theme,
          highContrast: state.highContrast,
        }),
      }
    ),
    {
      name: 'theme-store',
    }
  )
);

// Selectors
export const useTheme = () => useThemeStore(state => state.theme);
export const useEffectiveTheme = () =>
  useThemeStore(state => state.effectiveTheme);
export const useHighContrast = () => useThemeStore(state => state.highContrast);
export const useReducedMotion = () =>
  useThemeStore(state => state.reducedMotion);

// Action selectors
export const useThemeActions = () => {
  const setTheme = useThemeStore(state => state.setTheme);
  const setHighContrast = useThemeStore(state => state.setHighContrast);
  const setReducedMotion = useThemeStore(state => state.setReducedMotion);
  const toggleTheme = useThemeStore(state => state.toggleTheme);
  const initializeTheme = useThemeStore(state => state.initializeTheme);

  return {
    setTheme,
    setHighContrast,
    setReducedMotion,
    toggleTheme,
    initializeTheme,
  };
};
