'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'auto';

export interface ThemeState {
  theme: Theme;
  systemTheme: 'dark' | 'light';
  effectiveTheme: 'dark' | 'light';
  highContrast: boolean;
  reducedMotion: boolean;

  setTheme: (theme: Theme) => void;
  setHighContrast: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  toggleTheme: () => void;
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

        setTheme: theme => {
          const { systemTheme } = get();
          const effectiveTheme = theme === 'auto' ? systemTheme : theme;

          set(
            {
              theme,
              effectiveTheme,
            },
            false,
            'setTheme'
          );

          // Apply theme to document (only in browser)
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', effectiveTheme);
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
          const { theme } = get();
          const newTheme = theme === 'dark' ? 'light' : 'dark';
          get().setTheme(newTheme);
        },

        initializeTheme: () => {
          // Check if we're in the browser
          if (
            typeof window === 'undefined' ||
            typeof document === 'undefined'
          ) {
            return () => {}; // Return empty cleanup function for SSR
          }

          // Detect system theme
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
            .matches
            ? 'dark'
            : 'light';

          // Detect reduced motion preference
          const reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
          ).matches;

          const { theme } = get();
          const effectiveTheme = theme === 'auto' ? systemTheme : theme;

          set(
            {
              systemTheme,
              effectiveTheme,
              reducedMotion,
            },
            false,
            'initializeTheme'
          );

          // Apply initial theme
          document.documentElement.setAttribute('data-theme', effectiveTheme);
          document.documentElement.setAttribute(
            'data-high-contrast',
            get().highContrast.toString()
          );
          document.documentElement.setAttribute(
            'data-reduced-motion',
            reducedMotion.toString()
          );

          // Listen for system theme changes
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handleChange = (e: MediaQueryListEvent) => {
            const newSystemTheme = e.matches ? 'dark' : 'light';
            set({ systemTheme: newSystemTheme }, false, 'updateSystemTheme');

            if (get().theme === 'auto') {
              get().setTheme('auto');
            }
          };

          mediaQuery.addEventListener('change', handleChange);

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
            mediaQuery.removeEventListener('change', handleChange);
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
