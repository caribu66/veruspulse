import { render } from '@testing-library/react';
import { NetworkDashboard } from '@/components/network-dashboard';

// Simple test to check if component renders without crashing
describe('NetworkDashboard - Basic Test', () => {
  it('should render without crashing', () => {
    // This test will help us identify if there are any import or basic rendering issues
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

    expect(() => render(<NetworkDashboard {...mockProps} />)).not.toThrow();
  });
});
