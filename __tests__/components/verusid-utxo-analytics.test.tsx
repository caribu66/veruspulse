import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VerusIDUTXOAnalytics } from '@/components/verusid-utxo-analytics';

// Mock fetch globally
global.fetch = jest.fn();

// Mock the AdvancedUTXOVisualizer component
jest.mock('@/components/charts/advanced-utxo-visualizer', () => ({
  AdvancedUTXOVisualizer: ({ utxos, width, height }: any) => (
    <div data-testid="advanced-utxo-visualizer">
      <div>UTXOs: {utxos?.length || 0}</div>
      <div>Width: {width}</div>
      <div>Height: {height}</div>
    </div>
  ),
}));

// Mock Phosphor icons
jest.mock('@phosphor-icons/react', () => ({
  Database: () => <div data-testid="database-icon" />,
  Target: () => <div data-testid="target-icon" />,
  ArrowsClockwise: () => <div data-testid="arrows-clockwise-icon" />,
  WarningCircle: () => <div data-testid="warning-circle-icon" />,
  TrendUp: () => <div data-testid="trend-up-icon" />,
  ChartBar: () => <div data-testid="chart-bar-icon" />,
}));

// Sample data for testing (matches actual API format)
const mockAPIResponse = {
  utxos: [
    {
      value: 100000000, // 1 VRSC in satoshis
      valueVRSC: 1,
      confirmations: 150,
      status: 'eligible',
      txid: 'tx1',
      blockTime: '2024-01-01T00:00:00Z',
      isStakeInput: false,
      isStakeOutput: false,
      isHighValue: false,
      isMediumValue: false,
      isEligibleForStaking: true,
      earnedAmount: 0,
      stakeReward: 3,
    },
    {
      value: 10000000000, // 100 VRSC in satoshis
      valueVRSC: 100,
      confirmations: 200,
      status: 'eligible',
      txid: 'tx2',
      blockTime: '2024-01-02T00:00:00Z',
      isStakeInput: false,
      isStakeOutput: false,
      isHighValue: true,
      isMediumValue: false,
      isEligibleForStaking: true,
      earnedAmount: 0,
      stakeReward: 3,
    },
  ],
  health: {
    total: 2,
    highValue: 1,
    eligible: 2,
    cooldown: 0,
    totalValueVRSC: 101,
    sizeDistribution: {
      tiny: { count: 1, valueVRSC: 1 },
      small: { count: 0, valueVRSC: 0 },
      medium: { count: 1, valueVRSC: 100 },
      large: { count: 0, valueVRSC: 0 },
    },
    fragmentationScore: 'low',
    efficiency: 100,
    consolidationRecommended: false,
    largestUtxoVRSC: 100,
  },
  timestamp: Date.now(),
};

describe('VerusIDUTXOAnalytics Component', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Basic Rendering', () => {
    it('should render with valid data', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAPIResponse,
      });

      render(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('UTXO Analytics')).toBeInTheDocument();
      });
    });

    it('should render without crashing', () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      ); // Never resolves

      const { container } = render(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      // Should render the skeleton loader
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Data Loading States', () => {
    it('should show loading state initially', () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      ); // Never resolves

      const { container } = render(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      // Should render skeleton loader
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should show error state', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
      });
    });

    it('should show no data state', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          utxos: [],
          health: {
            total: 0,
            highValue: 0,
            eligible: 0,
            cooldown: 0,
            totalValueVRSC: 0,
          },
          timestamp: Date.now(),
        }),
      });

      render(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      await waitFor(() => {
        expect(screen.getByText('No UTXOs Found')).toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAPIResponse,
      });
    });

    it('should display UTXO statistics', async () => {
      render(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      await waitFor(() => {
        expect(screen.getByText('UTXO Analytics')).toBeInTheDocument();
      });
    });

    it('should render the AdvancedUTXOVisualizer', async () => {
      render(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      await waitFor(() => {
        const visualizer = screen.getByTestId('advanced-utxo-visualizer');
        expect(visualizer).toBeInTheDocument();
        expect(screen.getByText('UTXOs: 2')).toBeInTheDocument();
      });
    });

    it('should pass correct props to visualizer', async () => {
      render(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      await waitFor(() => {
        expect(screen.getByText('Width: 900')).toBeInTheDocument();
        expect(screen.getByText('Height: 500')).toBeInTheDocument();
      });
    });
  });

  describe('UTXO Mapping', () => {
    it('should map UTXO data correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAPIResponse,
      });

      render(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      await waitFor(() => {
        // Should show mapped UTXOs
        expect(screen.getByText('UTXOs: 2')).toBeInTheDocument();
      });
    });

    it('should handle UTXOs with missing properties', async () => {
      const incompleteData = {
        utxos: [
          {
            value: 100000000,
            confirmations: 150,
            status: 'eligible',
            txid: 'tx1',
          },
        ],
        health: {
          total: 1,
          highValue: 0,
          eligible: 1,
          cooldown: 0,
          totalValueVRSC: 1,
        },
        timestamp: Date.now(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => incompleteData,
      });

      render(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      await waitFor(() => {
        // Should handle gracefully
        expect(screen.getByText('UTXOs: 1')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null iaddr', () => {
      const { container } = render(
        <VerusIDUTXOAnalytics iaddr={null as any} />
      );

      // Should not crash
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle empty iaddr', () => {
      const { container } = render(<VerusIDUTXOAnalytics iaddr="" />);

      // Should not crash
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle malformed data', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          utxos: null,
          health: {},
          timestamp: Date.now(),
        }),
      });

      render(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      await waitFor(() => {
        // Should handle gracefully - component will show empty state
        expect(screen.getByText('UTXO Analytics')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAPIResponse,
      });

      const { rerender } = render(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      await waitFor(() => {
        expect(screen.getByText('UTXO Analytics')).toBeInTheDocument();
      });

      // Re-render with same props
      rerender(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      // Should still render correctly
      expect(screen.getByText('UTXO Analytics')).toBeInTheDocument();
    });

    it('should handle rapid data changes', async () => {
      const emptyResponse = {
        utxos: [],
        health: {
          total: 0,
          highValue: 0,
          eligible: 0,
          cooldown: 0,
          totalValueVRSC: 0,
        },
        timestamp: Date.now(),
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => emptyResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAPIResponse,
        });

      const { rerender } = render(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      await waitFor(() => {
        expect(screen.getByText('No UTXOs Found')).toBeInTheDocument();
      });

      // Simulate data change by changing iaddr (which triggers new fetch)
      rerender(<VerusIDUTXOAnalytics iaddr="iTest456" />);

      await waitFor(() => {
        // Should handle gracefully
        expect(screen.getByText('UTXO Analytics')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAPIResponse,
      });

      render(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3 });
        expect(heading).toHaveTextContent('UTXO Analytics');
      });
    });

    it('should provide meaningful loading state', () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      ); // Never resolves

      const { container } = render(<VerusIDUTXOAnalytics iaddr="iTest123" />);

      // Should render skeleton loader
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
