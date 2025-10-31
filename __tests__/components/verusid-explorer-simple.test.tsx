import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VerusIDExplorer } from '@/components/verusid-explorer';

// Mock fetch API
global.fetch = jest.fn() as jest.Mock;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('VerusIDExplorer - Basic Rendering', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();

    // Reset fetch mock with default responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      // Mock the sync status endpoint that VerusIDSyncStatus polls
      if (url.includes('/api/admin/sync-all-verusids')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            progress: {
              status: 'idle',
              total: 0,
              processed: 0,
              failed: 0,
              percentComplete: 0,
              errors: [],
            },
          }),
        } as Response);
      }

      // Mock the staking stats endpoint
      if (url.includes('/staking-stats')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              summary: { totalStakes: 1 },
            },
          }),
        } as Response);
      }

      // Default mock for other endpoints
      return Promise.resolve({
        ok: false,
        json: async () => ({ success: false, error: 'Not mocked' }),
      } as Response);
    });
  });

  it('should render without crashing', () => {
    render(<VerusIDExplorer />);
    expect(screen.getByText('VerusID Explorer')).toBeInTheDocument();
  });

  // Breadcrumb navigation is not implemented in the current component

  it('should render empty state by default', () => {
    render(<VerusIDExplorer />);
    expect(screen.getByText('Discover VerusID Identities')).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(<VerusIDExplorer />);
    const input = screen.getByPlaceholderText(/Enter VerusID/i);
    expect(input).toBeInTheDocument();
  });

  it('should display empty state features', () => {
    render(<VerusIDExplorer />);
    expect(screen.getByText('Balance & Holdings')).toBeInTheDocument();
    expect(screen.getByText('Staking Analytics')).toBeInTheDocument();
    expect(screen.getByText('Identity Details')).toBeInTheDocument();
  });

  it('should show example search formats', () => {
    render(<VerusIDExplorer />);
    expect(screen.getByText(/@username/)).toBeInTheDocument();
    expect(screen.getByText(/username.VRSC@/)).toBeInTheDocument();
  });

  it('should have Search tab active by default', () => {
    render(<VerusIDExplorer />);
    const searchInput = screen.getByPlaceholderText(/Enter VerusID/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('should display page description', () => {
    render(<VerusIDExplorer />);
    expect(screen.getByText(/Explore VerusID identities/i)).toBeInTheDocument();
  });

  it('should have proper component structure', () => {
    const { container } = render(<VerusIDExplorer />);
    expect(container.firstChild).toHaveClass('space-y-6');
  });

  it('should render tab buttons', () => {
    render(<VerusIDExplorer />);
    // Check for Search and Browse buttons (Trending is not implemented)
    expect(screen.getByRole('button', { name: /Browse/i })).toBeInTheDocument();
    // Note: Search button text may be in different languages, so we check for the input field instead
    const searchInput = screen.getByPlaceholderText(/Enter VerusID/i);
    expect(searchInput).toBeInTheDocument();
  });

  // Navigation aria-label for breadcrumb is not implemented in the current component

  it('should load without recent searches initially', () => {
    render(<VerusIDExplorer />);
    expect(screen.queryByText('Recent Searches:')).not.toBeInTheDocument();
  });

  it('should display recent searches when available in localStorage', () => {
    localStorage.setItem(
      'verusid-recent-searches',
      JSON.stringify(['User1@', 'User2@'])
    );

    render(<VerusIDExplorer />);

    expect(screen.getByText('Recent Searches:')).toBeInTheDocument();
    expect(screen.getByText('User1@')).toBeInTheDocument();
    expect(screen.getByText('User2@')).toBeInTheDocument();
  });

  it('should set page title on mount', () => {
    render(<VerusIDExplorer />);
    expect(document.title).toContain('VerusID Explorer');
  });
});
