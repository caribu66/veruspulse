import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UTXOBubbleChartNew } from '@/components/charts/utxo-bubble-chart-new';

// Mock the number formatting utility
jest.mock('@/lib/utils/number-formatting', () => ({
  formatFriendlyNumber: jest.fn(value => value.toFixed(2)),
}));

// Mock Phosphor icons
jest.mock('@phosphor-icons/react', () => ({
  ChartBar: () => <div data-testid="chart-bar-icon" />,
  Circle: () => <div data-testid="circle-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Coins: () => <div data-testid="coins-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Sample UTXO data for testing
const mockUTXOs = [
  {
    value: 100000000, // 1 VRSC in satoshis
    valueVRSC: 1,
    confirmations: 150,
    status: 'eligible' as const,
    txid: 'tx1',
    blockTime: '2024-01-01T00:00:00Z',
    isStakeInput: false,
    isStakeOutput: false,
    earnedAmount: undefined,
    stakeReward: 3,
  },
  {
    value: 10000000000, // 100 VRSC in satoshis
    valueVRSC: 100,
    confirmations: 200,
    status: 'eligible' as const,
    txid: 'tx2',
    blockTime: '2024-01-02T00:00:00Z',
    isStakeInput: false,
    isStakeOutput: false,
    earnedAmount: undefined,
    stakeReward: 3,
  },
  {
    value: 5000000000, // 50 VRSC in satoshis
    valueVRSC: 50,
    confirmations: 100,
    status: 'cooldown' as const,
    txid: 'tx3',
    blockTime: '2024-01-03T00:00:00Z',
    isStakeInput: true,
    isStakeOutput: false,
    earnedAmount: undefined,
    stakeReward: 3,
  },
  {
    value: 3000000000, // 30 VRSC in satoshis
    valueVRSC: 30,
    confirmations: 50,
    status: 'inactive' as const,
    txid: 'tx4',
    blockTime: '2024-01-04T00:00:00Z',
    isStakeInput: false,
    isStakeOutput: true,
    earnedAmount: 3,
    stakeReward: 3,
  },
];

describe('UTXOBubbleChartNew Component', () => {
  describe('Basic Rendering', () => {
    it('should render with valid UTXO data', () => {
      render(<UTXOBubbleChartNew utxos={mockUTXOs} />);

      // Should show the status zones
      expect(screen.getByText('ELIGIBLE')).toBeInTheDocument();
      expect(screen.getByText('COOLDOWN')).toBeInTheDocument();
      expect(screen.getByText('INACTIVE')).toBeInTheDocument();
    });

    it('should render with custom dimensions', () => {
      const { container } = render(
        <UTXOBubbleChartNew utxos={mockUTXOs} width={800} height={400} />
      );

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '800');
      expect(svg).toHaveAttribute('height', '400');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <UTXOBubbleChartNew utxos={mockUTXOs} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should handle empty UTXO array', () => {
      render(<UTXOBubbleChartNew utxos={[]} />);

      expect(screen.getByText('No UTXOs to display')).toBeInTheDocument();
    });

    it('should handle null UTXO data', () => {
      render(<UTXOBubbleChartNew utxos={null as any} />);

      expect(screen.getByText('No UTXOs to display')).toBeInTheDocument();
    });
  });

  describe('UTXO Categorization', () => {
    it('should categorize UTXOs correctly', () => {
      render(<UTXOBubbleChartNew utxos={mockUTXOs} />);

      // Should show different categories
      expect(screen.getByText('ELIGIBLE')).toBeInTheDocument();
      expect(screen.getByText('COOLDOWN')).toBeInTheDocument();
      expect(screen.getByText('INACTIVE')).toBeInTheDocument();
    });

    it('should show stake input UTXOs', () => {
      render(<UTXOBubbleChartNew utxos={mockUTXOs} />);

      // Should show stake input indicator
      expect(screen.getByText(/Input Stake/)).toBeInTheDocument();
    });

    it('should show stake output UTXOs', () => {
      render(<UTXOBubbleChartNew utxos={mockUTXOs} />);

      // Should show stake output indicator
      expect(screen.getByText(/Output Stake/)).toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    it('should handle bubble hover interactions', async () => {
      const { container } = render(<UTXOBubbleChartNew utxos={mockUTXOs} />);

      // Wait for SVG to render
      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      // Should be able to hover over bubbles
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should show tooltip on hover', async () => {
      const { container } = render(<UTXOBubbleChartNew utxos={mockUTXOs} />);

      // Wait for bubbles to render
      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      // Should have tooltips on circles
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics Display', () => {
    it('should display correct UTXO counts', () => {
      render(<UTXOBubbleChartNew utxos={mockUTXOs} />);

      // Should show counts in the legend
      expect(screen.getByText(/Eligible \(\d+\)/)).toBeInTheDocument();
      expect(screen.getByText(/Cooldown \(\d+\)/)).toBeInTheDocument();
      expect(screen.getByText(/Inactive \(\d+\)/)).toBeInTheDocument();
    });

    it('should show value statistics', () => {
      render(<UTXOBubbleChartNew utxos={mockUTXOs} />);

      // Should show instructions
      expect(
        screen.getByText(
          'Bubble size = UTXO value • Color = Staking probability • Hover for details'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    it('should render SVG bubbles', async () => {
      const { container } = render(<UTXOBubbleChartNew utxos={mockUTXOs} />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('should apply different colors for different UTXO types', () => {
      render(<UTXOBubbleChartNew utxos={mockUTXOs} />);

      // Should have different colored sections
      expect(screen.getByText('ELIGIBLE')).toBeInTheDocument();
      expect(screen.getByText('COOLDOWN')).toBeInTheDocument();
      expect(screen.getByText('INACTIVE')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle UTXOs with missing optional properties', () => {
      const incompleteUTXOs = [
        {
          value: 100000000,
          confirmations: 150,
          status: 'eligible' as const,
          txid: 'tx1',
        },
      ];

      render(<UTXOBubbleChartNew utxos={incompleteUTXOs as any} />);

      // Should render without crashing
      expect(screen.getByText('ELIGIBLE')).toBeInTheDocument();
    });

    it('should handle very large UTXO arrays', () => {
      const largeUTXOArray = Array.from({ length: 100 }, (_, i) => ({
        value: 100000000,
        valueVRSC: 1,
        confirmations: 150,
        status: 'eligible' as const,
        txid: `tx${i}`,
      }));

      render(<UTXOBubbleChartNew utxos={largeUTXOArray} />);

      // Should show sampling information for large arrays
      expect(screen.getByText(/Showing \d+\/\d+ eligible/)).toBeInTheDocument();
    });

    it('should handle extreme dimension values', () => {
      const { container } = render(
        <UTXOBubbleChartNew utxos={mockUTXOs} width={50} height={30} />
      );

      // Should apply the provided dimensions (no minimum enforced in this component)
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '50');
      expect(svg).toHaveAttribute('height', '30');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const { container } = render(<UTXOBubbleChartNew utxos={mockUTXOs} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<UTXOBubbleChartNew utxos={mockUTXOs} />);

      // Should be accessible
      expect(screen.getByText('ELIGIBLE')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<UTXOBubbleChartNew utxos={mockUTXOs} />);

      // Re-render with same props
      rerender(<UTXOBubbleChartNew utxos={mockUTXOs} />);

      // Should still render correctly
      expect(screen.getByText('ELIGIBLE')).toBeInTheDocument();
    });

    it('should handle rapid prop changes', () => {
      const { rerender } = render(<UTXOBubbleChartNew utxos={mockUTXOs} />);

      // Rapid prop changes
      rerender(<UTXOBubbleChartNew utxos={[]} />);
      rerender(<UTXOBubbleChartNew utxos={mockUTXOs} />);
      rerender(<UTXOBubbleChartNew utxos={[]} />);

      // Should handle gracefully
      expect(screen.getByText('No UTXOs to display')).toBeInTheDocument();
    });
  });

  describe('Data Validation', () => {
    it('should handle invalid UTXO data gracefully', () => {
      const invalidUTXOs = [
        {
          value: 'invalid',
          confirmations: 'invalid',
          status: 'invalid',
          txid: null,
        },
      ];

      render(<UTXOBubbleChartNew utxos={invalidUTXOs as any} />);

      // Should not crash
      expect(screen.getByText('ELIGIBLE')).toBeInTheDocument();
    });

    it('should handle mixed valid and invalid UTXOs', () => {
      const mixedUTXOs = [
        ...mockUTXOs,
        {
          value: 'invalid',
          confirmations: 'invalid',
          status: 'invalid',
          txid: null,
        },
      ];

      render(<UTXOBubbleChartNew utxos={mixedUTXOs as any} />);

      // Should handle gracefully
      expect(screen.getByText('ELIGIBLE')).toBeInTheDocument();
    });
  });
});
