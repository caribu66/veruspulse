import { render, screen, waitFor } from '@testing-library/react';
import { NetworkDashboard } from '@/components/network-dashboard';

// Mock fetch to simulate API failures
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('NetworkDashboard', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('renders network dashboard component', () => {
    const mockProps = {
      networkStats: null,
      miningStats: null,
      mempoolStats: null,
      stakingStats: null,
      pbaasChains: [],
      loading: false,
      lastUpdate: null,
      fetchAllData: jest.fn(),
    };

    render(<NetworkDashboard {...mockProps} />);

    // Check if the component renders without crashing
    expect(screen.getByText(/Connection Error/i)).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    const mockProps = {
      networkStats: null,
      miningStats: null,
      mempoolStats: null,
      stakingStats: null,
      pbaasChains: [],
      loading: true,
      lastUpdate: null,
      fetchAllData: jest.fn(),
    };

    render(<NetworkDashboard {...mockProps} />);

    // Should show loading state
    expect(screen.getByText(/Loading Network Data/i)).toBeInTheDocument();
  });

  it('displays connection error when no data is available', async () => {
    // Mock all API calls to fail
    mockFetch.mockRejectedValue(new Error('Network error'));

    const mockProps = {
      networkStats: null,
      miningStats: null,
      mempoolStats: null,
      stakingStats: null,
      pbaasChains: [],
      loading: false,
      lastUpdate: null,
      fetchAllData: jest.fn(),
    };

    render(<NetworkDashboard {...mockProps} />);

    // Wait for the error state to appear
    await waitFor(() => {
      expect(screen.getByText(/Connection Error/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Unable to connect to the blockchain network/i)
      ).toBeInTheDocument();
    });
  });

  it('displays connection error when API returns error responses', async () => {
    // Mock API calls to return error responses
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Failed to fetch blockchain information',
        }),
    });

    const mockProps = {
      networkStats: null,
      miningStats: null,
      mempoolStats: null,
      stakingStats: null,
      pbaasChains: [],
      loading: false,
      lastUpdate: null,
      fetchAllData: jest.fn(),
    };

    render(<NetworkDashboard {...mockProps} />);

    // Wait for the error state to appear
    await waitFor(() => {
      expect(screen.getByText(/Connection Error/i)).toBeInTheDocument();
    });
  });
});
