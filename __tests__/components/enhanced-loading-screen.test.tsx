import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedLoadingScreen } from '@/components/enhanced-loading-screen';

// Mock timers
jest.useFakeTimers();

describe('EnhancedLoadingScreen Component', () => {
  it('should render the loading screen and progress to 100%', async () => {
    render(<EnhancedLoadingScreen />);

    expect(screen.getByText('Loading Network Data')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText('✅ Data loaded successfully!')
      ).toBeInTheDocument();
    });
  });
});
