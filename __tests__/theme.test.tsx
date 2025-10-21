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

// Test component to access theme context
function TestComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <button data-testid="toggle-theme" onClick={toggleTheme}>
        Toggle Theme
      </button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>
        Set Dark
      </button>
      <button data-testid="set-light" onClick={() => setTheme('light')}>
        Set Light
      </button>
    </div>
  );
}

describe('Theme Context', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    document.documentElement.className = '';
  });

  it('should default to dark theme', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });
  });

  it('should use saved theme from localStorage', async () => {
    localStorageMock.getItem.mockReturnValue('light');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    });
  });

  it('should toggle theme correctly', async () => {
    localStorageMock.getItem.mockReturnValue('dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });

    fireEvent.click(screen.getByTestId('toggle-theme'));

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    });
  });

  it('should set theme directly', async () => {
    localStorageMock.getItem.mockReturnValue('dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('set-light'));

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    });
  });

  it('should save theme to localStorage', async () => {
    localStorageMock.getItem.mockReturnValue('dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('toggle-theme'));

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
    });
  });

  it('should add/remove dark class to document', async () => {
    localStorageMock.getItem.mockReturnValue('dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    fireEvent.click(screen.getByTestId('toggle-theme'));

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});

describe('Theme Toggle Components', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue('dark');
  });

  it('should render ThemeToggle with correct icon for dark theme', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    await waitFor(() => {
      // Should show sun icon in dark theme
      const sunIcon =
        document.querySelector('[data-testid="sun-icon"]') ||
        document.querySelector('svg[class*="text-yellow-300"]');
      expect(sunIcon).toBeTruthy();
    });
  });

  it('should render ThemeToggleCompact with correct styling', async () => {
    render(
      <ThemeProvider>
        <ThemeToggleCompact />
      </ThemeProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-slate-800');
  });

  it('should toggle theme when clicked', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
    });
  });

  it('should have proper accessibility attributes', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    expect(button).toHaveAttribute('title');
  });
});

describe('Theme CSS Classes', () => {
  it('should apply correct dark theme classes', async () => {
    localStorageMock.getItem.mockReturnValue('dark');

    render(
      <ThemeProvider>
        <div className="bg-slate-900 dark:bg-slate-900 bg-white text-white dark:text-white text-slate-900">
          Test Content
        </div>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('should apply correct light theme classes', async () => {
    localStorageMock.getItem.mockReturnValue('light');

    render(
      <ThemeProvider>
        <div className="bg-slate-900 dark:bg-slate-900 bg-white text-white dark:text-white text-slate-900">
          Test Content
        </div>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});

describe('Theme Persistence', () => {
  it('should persist theme across page reloads', async () => {
    localStorageMock.getItem.mockReturnValue('light');

    const { unmount } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    });

    unmount();

    // Simulate page reload
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    });
  });
});

describe('System Theme Detection', () => {
  it('should detect system dark theme preference', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    // Mock system prefers dark theme
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });
  });

  it('should default to dark theme when no preference is saved', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });
  });
});
