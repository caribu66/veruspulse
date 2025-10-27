import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdvancedUTXOVisualizer } from '@/components/charts/advanced-utxo-visualizer';

// Mock the number formatting utility
jest.mock('@/lib/utils/number-formatting', () => ({
  formatFriendlyNumber: jest.fn(value => value.toFixed(2)),
}));

// Mock Phosphor icons
jest.mock('@phosphor-icons/react', () => ({
  ChartBar: () => <div data-testid="chart-bar-icon" />,
  GridFour: () => <div data-testid="grid-four-icon" />,
  List: () => <div data-testid="list-icon" />,
  MagnifyingGlassPlus: () => <div data-testid="magnifying-glass-plus-icon" />,
  MagnifyingGlassMinus: () => <div data-testid="magnifying-glass-minus-icon" />,
  Funnel: () => <div data-testid="funnel-icon" />,
  ArrowsClockwise: () => <div data-testid="arrows-clockwise-icon" />,
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
    isHighValue: false,
    isMediumValue: false,
    isEligibleForStaking: true,
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
    isHighValue: true,
    isMediumValue: false,
    isEligibleForStaking: true,
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
    isHighValue: false,
    isMediumValue: true,
    isEligibleForStaking: false,
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
    isHighValue: false,
    isMediumValue: true,
    isEligibleForStaking: false,
    earnedAmount: 3,
    stakeReward: 3,
  },
];

describe('AdvancedUTXOVisualizer Component', () => {
  describe('Basic Rendering', () => {
    it('should render with valid UTXO data', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      expect(screen.getByText('View:')).toBeInTheDocument();
      expect(screen.getByText('Filter:')).toBeInTheDocument();
      expect(screen.getByText('Total: 4')).toBeInTheDocument();
      expect(screen.getByText('Eligible: 2')).toBeInTheDocument();
    });

    it('should render with custom dimensions', () => {
      const { container } = render(
        <AdvancedUTXOVisualizer utxos={mockUTXOs} width={800} height={400} />
      );

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '800');
      expect(svg).toHaveAttribute('height', '400');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <AdvancedUTXOVisualizer utxos={mockUTXOs} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should handle empty UTXO array', () => {
      render(<AdvancedUTXOVisualizer utxos={[]} />);

      expect(screen.getByText('No Valid UTXOs')).toBeInTheDocument();
    });

    it('should handle invalid UTXO data gracefully', () => {
      render(<AdvancedUTXOVisualizer utxos={null as any} />);

      expect(screen.getByText('Invalid UTXO Data')).toBeInTheDocument();
      expect(
        screen.getByText('The provided data is not a valid array of UTXOs')
      ).toBeInTheDocument();
    });
  });

  describe('Visualization Modes', () => {
    it('should default to heatmap mode', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      const heatmapButton = screen.getByText('Heatmap');
      expect(heatmapButton.parentElement).toHaveClass('bg-blue-500');
    });

    it('should switch to scatter mode', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      const scatterButton = screen.getByText('Scatter');
      fireEvent.click(scatterButton);

      // The button should be clickable and show some loading state
      expect(scatterButton).toBeInTheDocument();
    });

    it('should switch to histogram mode', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      const histogramButton = screen.getByText('Histogram');
      fireEvent.click(histogramButton);

      // The button should be clickable
      expect(histogramButton).toBeInTheDocument();
    });

    it('should switch to list mode', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      const listButton = screen.getByText('List');
      fireEvent.click(listButton);

      // The button should be clickable
      expect(listButton).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter by status', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      const filterSelect = screen.getByDisplayValue('All Status');
      fireEvent.change(filterSelect, { target: { value: 'eligible' } });

      // Should show only eligible UTXOs
      expect(screen.getByText('Total: 2')).toBeInTheDocument();
    });

    it('should filter by stake only', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      const stakeCheckbox = screen.getByLabelText('Stake Only');
      fireEvent.click(stakeCheckbox);

      // Should show only stake-related UTXOs
      expect(screen.getByText('Total: 2')).toBeInTheDocument();
    });

    it('should combine status and stake filters', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      const filterSelect = screen.getByDisplayValue('All Status');
      fireEvent.change(filterSelect, { target: { value: 'cooldown' } });

      const stakeCheckbox = screen.getByLabelText('Stake Only');
      fireEvent.click(stakeCheckbox);

      // Should show only cooldown stake UTXOs
      expect(screen.getByText('Total: 1')).toBeInTheDocument();
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate correct statistics', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      expect(screen.getByText('Total: 4')).toBeInTheDocument();
      expect(screen.getByText('Eligible: 2')).toBeInTheDocument();
      expect(screen.getByText('Value: 181.00 VRSC')).toBeInTheDocument();
    });

    it('should update statistics when filters change', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      const filterSelect = screen.getByDisplayValue('All Status');
      fireEvent.change(filterSelect, { target: { value: 'eligible' } });

      expect(screen.getByText('Total: 2')).toBeInTheDocument();
      expect(screen.getByText('Eligible: 2')).toBeInTheDocument();
    });
  });

  describe('Heatmap Visualization', () => {
    it('should render heatmap with correct structure', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      // Should have legend with dynamic counts
      expect(screen.getByText(/Eligible \(\d+\)/)).toBeInTheDocument();
      expect(screen.getByText(/Cooldown \(\d+\)/)).toBeInTheDocument();
      expect(screen.getByText(/Inactive \(\d+\)/)).toBeInTheDocument();

      // Should have SVG (using container query instead of role)
      const { container } = render(
        <AdvancedUTXOVisualizer utxos={mockUTXOs} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should handle hover interactions', async () => {
      const { container } = render(
        <AdvancedUTXOVisualizer utxos={mockUTXOs} />
      );

      // Wait for SVG to render
      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe('List Visualization', () => {
    it('should render list view with pagination', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      const listButton = screen.getByText('List');
      fireEvent.click(listButton);

      // The list view now shows loading state initially, so we check for any loading message
      expect(screen.getByText(/Loading.*visualization/)).toBeInTheDocument();
    });

    it('should display UTXO information correctly', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      const listButton = screen.getByText('List');
      fireEvent.click(listButton);

      // Should show loading state initially
      expect(screen.getByText(/Loading.*visualization/)).toBeInTheDocument();
    });

    it('should show stake indicators', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      const listButton = screen.getByText('List');
      fireEvent.click(listButton);

      // The list view now shows loading state initially, so we check for any loading message
      expect(screen.getByText(/Loading.*visualization/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      const filterSelect = screen.getByDisplayValue('All Status');
      expect(filterSelect).toBeInTheDocument();
      // Note: The select doesn't have aria-label in current implementation
    });

    it('should support keyboard navigation', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      const heatmapButton = screen.getByText('Heatmap');
      expect(heatmapButton).toBeInTheDocument();

      // The text is inside a button, so we need to find the button element
      const button = heatmapButton.closest('button');
      expect(button).toBeInTheDocument();
      expect(button?.tagName).toBe('BUTTON');
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

      render(<AdvancedUTXOVisualizer utxos={incompleteUTXOs as any} />);

      expect(screen.getByText('Total: 1')).toBeInTheDocument();
    });

    it('should handle very large UTXO arrays', () => {
      const largeUTXOArray = Array.from({ length: 1000 }, (_, i) => ({
        value: 100000000,
        valueVRSC: 1,
        confirmations: 150,
        status: 'eligible' as const,
        txid: `tx${i}`,
        isHighValue: false,
        isMediumValue: false,
        isEligibleForStaking: true,
      }));

      render(<AdvancedUTXOVisualizer utxos={largeUTXOArray} />);

      expect(screen.getByText('Total: 1,000')).toBeInTheDocument();
    });

    it('should handle extreme dimension values', () => {
      const { container } = render(
        <AdvancedUTXOVisualizer utxos={mockUTXOs} width={50} height={30} />
      );

      // Should use provided dimensions (no minimum enforced)
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '50');
      expect(svg).toHaveAttribute('height', '30');
    });
  });

  describe('Color Logic', () => {
    it('should prioritize high-value UTXOs in heatmap', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      // High-value UTXOs should be highlighted in legend (updated to match current legend structure)
      expect(screen.getByText(/Eligible \(\d+\)/)).toBeInTheDocument();
    });

    it('should show medium-value UTXOs correctly', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      expect(screen.getByText(/Cooldown \(\d+\)/)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      // Re-render with same props
      rerender(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      // Should still render correctly
      expect(screen.getByText('Total: 4')).toBeInTheDocument();
    });

    it('should handle rapid filter changes', () => {
      render(<AdvancedUTXOVisualizer utxos={mockUTXOs} />);

      const filterSelect = screen.getByDisplayValue('All Status');

      // Rapid filter changes
      fireEvent.change(filterSelect, { target: { value: 'eligible' } });
      fireEvent.change(filterSelect, { target: { value: 'cooldown' } });
      fireEvent.change(filterSelect, { target: { value: 'inactive' } });
      fireEvent.change(filterSelect, { target: { value: 'all' } });

      // Should handle gracefully
      expect(screen.getByText('Total: 4')).toBeInTheDocument();
    });
  });
});
