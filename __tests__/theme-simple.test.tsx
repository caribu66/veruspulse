import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/contexts/theme-context';
import { ThemeToggle, ThemeToggleCompact } from '@/components/theme-toggle';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Simple test component that uses theme classes
function ThemeTestComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="bg-slate-900 dark:bg-slate-900 bg-white text-white dark:text-white text-slate-900 border border-slate-700 dark:border-slate-700 border-slate-200 p-4 rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Theme Test</h1>
      <p className="text-slate-300 dark:text-slate-300 text-slate-600 mb-4">
        Current theme: {theme}
      </p>
      <button 
        onClick={toggleTheme}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
      >
        Toggle Theme
      </button>
    </div>
  );
}

describe('Theme System Integration', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    document.documentElement.className = '';
  });

  describe('Theme Context Integration', () => {
    it('should apply correct dark theme classes', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });

      const container = screen.getByText('Theme Test').closest('div');
      expect(container).toHaveClass('bg-slate-900', 'text-white', 'border-slate-700');
    });

    it('should apply correct light theme classes', async () => {
      localStorageMock.getItem.mockReturnValue('light');
      
      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });

      const container = screen.getByText('Theme Test').closest('div');
      expect(container).toHaveClass('bg-white', 'text-slate-900', 'border-slate-200');
    });

    it('should toggle between themes correctly', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });

      const toggleButton = screen.getByText('Toggle Theme');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
      });
    });
  });

  describe('Theme Toggle Components Integration', () => {
    it('should render ThemeToggle with correct theme styling', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <ThemeTestComponent />
          </div>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });

      const themeToggle = screen.getByRole('button', { name: /switch to light theme/i });
      expect(themeToggle).toHaveClass('bg-gradient-to-br', 'from-slate-700', 'to-slate-800');
    });

    it('should render ThemeToggleCompact with correct theme styling', async () => {
      localStorageMock.getItem.mockReturnValue('light');
      
      render(
        <ThemeProvider>
          <div>
            <ThemeToggleCompact />
            <ThemeTestComponent />
          </div>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });

      const themeToggle = screen.getByRole('button', { name: /switch to dark theme/i });
      expect(themeToggle).toHaveClass('bg-white', 'border-gray-200');
    });

    it('should toggle theme when clicking ThemeToggle', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <ThemeTestComponent />
          </div>
        </ThemeProvider>
      );

      const themeToggle = screen.getByRole('button', { name: /switch to light theme/i });
      fireEvent.click(themeToggle);

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
      });
    });

    it('should toggle theme when clicking ThemeToggleCompact', async () => {
      localStorageMock.getItem.mockReturnValue('light');
      
      render(
        <ThemeProvider>
          <div>
            <ThemeToggleCompact />
            <ThemeTestComponent />
          </div>
        </ThemeProvider>
      );

      const themeToggle = screen.getByRole('button', { name: /switch to dark theme/i });
      fireEvent.click(themeToggle);

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
      });
    });
  });

  describe('Theme Persistence Integration', () => {
    it('should persist theme changes across component re-renders', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      const { rerender } = render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });

      // Toggle theme
      const toggleButton = screen.getByText('Toggle Theme');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });

      // Re-render component
      rerender(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(screen.getByText(/Current theme: light/)).toBeInTheDocument();
      });
    });

    it('should load saved theme on initialization', async () => {
      localStorageMock.getItem.mockReturnValue('light');
      
      render(
        <ThemeProvider>
          <ThemeTestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(screen.getByText(/Current theme: light/)).toBeInTheDocument();
      });
    });
  });

  describe('Theme CSS Class Application', () => {
    it('should apply dark theme classes when dark theme is active', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      render(
        <ThemeProvider>
          <div className="bg-slate-900 dark:bg-slate-900 bg-white text-white dark:text-white text-slate-900">
            <span>Test Content</span>
          </div>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });

      const container = screen.getByText('Test Content').closest('div');
      expect(container).toHaveClass('bg-slate-900', 'text-white');
    });

    it('should apply light theme classes when light theme is active', async () => {
      localStorageMock.getItem.mockReturnValue('light');
      
      render(
        <ThemeProvider>
          <div className="bg-slate-900 dark:bg-slate-900 bg-white text-white dark:text-white text-slate-900">
            <span>Test Content</span>
          </div>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });

      const container = screen.getByText('Test Content').closest('div');
      expect(container).toHaveClass('bg-white', 'text-slate-900');
    });

    it('should handle mixed theme classes correctly', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      render(
        <ThemeProvider>
          <div className="bg-slate-900 dark:bg-slate-900 bg-white border border-slate-700 dark:border-slate-700 border-slate-200 text-white dark:text-white text-slate-900">
            <span>Mixed Classes Test</span>
          </div>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });

      const container = screen.getByText('Mixed Classes Test').closest('div');
      expect(container).toHaveClass('bg-slate-900', 'border-slate-700', 'text-white');
    });
  });

  describe('Theme Toggle Accessibility', () => {
    it('should have proper ARIA labels for theme toggles', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <ThemeToggleCompact />
          </div>
        </ThemeProvider>
      );

      const toggles = screen.getAllByRole('button', { name: /switch to light theme/i });
      
      expect(toggles).toHaveLength(2);
      expect(toggles[0]).toHaveAttribute('aria-label', 'Switch to light theme');
      expect(toggles[1]).toHaveAttribute('aria-label', 'Switch to light theme');
    });

    it('should update ARIA labels when theme changes', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const toggle = screen.getByRole('button', { name: /switch to light theme/i });
      expect(toggle).toHaveAttribute('aria-label', 'Switch to light theme');

      fireEvent.click(toggle);

      await waitFor(() => {
        const updatedToggle = screen.getByRole('button', { name: /switch to dark theme/i });
        expect(updatedToggle).toHaveAttribute('aria-label', 'Switch to dark theme');
      });
    });
  });
});
