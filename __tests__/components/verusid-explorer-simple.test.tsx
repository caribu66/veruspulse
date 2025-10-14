import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VerusIDExplorer } from '@/components/verusid-explorer';

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
  });

  it('should render without crashing', () => {
    render(<VerusIDExplorer />);
    expect(screen.getByText('VerusID Explorer')).toBeInTheDocument();
  });

  it('should display breadcrumb navigation', () => {
    render(<VerusIDExplorer />);
    expect(screen.getByText('Verus Explorer')).toBeInTheDocument();
    expect(screen.getByText('VerusIDs')).toBeInTheDocument();
  });

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
    expect(container.firstChild).toHaveClass('space-y-8');
  });

  it('should render all tab buttons', () => {
    render(<VerusIDExplorer />);
    const buttons = screen.getAllByRole('button', { name: /^Search$/i });
    expect(buttons.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Browse/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Trending/i })
    ).toBeInTheDocument();
  });

  it('should have navigation aria-label', () => {
    render(<VerusIDExplorer />);
    const nav = screen.getByLabelText('Breadcrumb');
    expect(nav).toBeInTheDocument();
  });

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
