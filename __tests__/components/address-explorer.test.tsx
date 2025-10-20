import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AddressExplorer } from '@/components/address-explorer';

// Mock fetch
global.fetch = jest.fn();

// Mock the logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('AddressExplorer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with initial state', () => {
    render(<AddressExplorer />);

    expect(screen.getByText('Address Explorer')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Analyze Verus addresses, balances, and transaction history. VerusID support depends on blockchain configuration.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        'Enter Verus address (R9vqQz8...) or VerusID (verus@) - Note: VerusID requires identity APIs'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('MagnifyingGlass')).toBeInTheDocument();
  });

  it('displays loading state when searching', async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve({ success: true, data: {} }),
              } as Response),
            100
          )
        )
    );

    render(<AddressExplorer />);

    const input = screen.getByPlaceholderText(
      'Enter Verus address (R9vqQz8...) or VerusID (verus@) - Note: VerusID requires identity APIs'
    );
    const button = screen.getByText('MagnifyingGlass');

    fireEvent.change(input, { target: { value: 'R9vqQz8test123' } });
    fireEvent.click(button);

    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('handles regular address search successfully', async () => {
    const mockAddressData = {
      success: true,
      data: {
        address: 'R9vqQz8test123',
        balance: {
          balance: 1.5,
          received: 10.0,
          sent: 8.5,
        },
        transactions: [
          {
            txid: 'tx123',
            time: 1696500000,
            amount: 1.5,
            confirmations: 100,
          },
        ],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAddressData),
    } as Response);

    render(<AddressExplorer />);

    const input = screen.getByPlaceholderText(
      'Enter Verus address (R9vqQz8...) or VerusID (verus@) - Note: VerusID requires identity APIs'
    );
    const button = screen.getByText('MagnifyingGlass');

    fireEvent.change(input, { target: { value: 'R9vqQz8test123' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('R9vqQz8test123')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/address/R9vqQz8test123');
  });

  it('handles VerusID search successfully', async () => {
    const mockVerusIDData = {
      success: true,
      data: {
        identity: {
          name: 'test@',
          primaryaddresses: ['R9vqQz8primary123'],
          identityaddress: 'R9vqQz8identity123',
        },
      },
    };

    const mockAddressData = {
      success: true,
      data: {
        address: 'R9vqQz8primary123',
        balance: {
          balance: 2.0,
          received: 15.0,
          sent: 13.0,
          txcount: 5,
        },
        utxos: [],
        transactions: [],
      },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVerusIDData),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAddressData),
      } as Response);

    render(<AddressExplorer />);

    const input = screen.getByPlaceholderText(
      'Enter Verus address (R9vqQz8...) or VerusID (verus@) - Note: VerusID requires identity APIs'
    );
    const button = screen.getByText('MagnifyingGlass');

    fireEvent.change(input, { target: { value: 'test@' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('test@')).toBeInTheDocument();
      expect(screen.getByText('Primary Address:')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/verusid-lookup',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ identity: 'test@' }),
      })
    );
  });

  it('handles VerusID search with identity APIs not activated', async () => {
    const mockVerusIDData = {
      success: false,
      error: 'Identity APIs not activated on blockchain',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockVerusIDData),
    } as Response);

    render(<AddressExplorer />);

    const input = screen.getByPlaceholderText(
      'Enter Verus address (R9vqQz8...) or VerusID (verus@) - Note: VerusID requires identity APIs'
    );
    const button = screen.getByText('MagnifyingGlass');

    fireEvent.change(input, { target: { value: 'test@' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(
          'VerusID lookup is not available - Identity APIs are not activated on this blockchain. Please enter a regular Verus address instead.'
        )
      ).toBeInTheDocument();
    });
  });

  it('handles search errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<AddressExplorer />);

    const input = screen.getByPlaceholderText(
      'Enter Verus address (R9vqQz8...) or VerusID (verus@) - Note: VerusID requires identity APIs'
    );
    const button = screen.getByText('MagnifyingGlass');

    fireEvent.change(input, { target: { value: 'test@' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Failed to lookup VerusID')).toBeInTheDocument();
    });
  });

  it('handles API response errors', async () => {
    const mockErrorResponse = {
      success: false,
      error: 'Invalid address format',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockErrorResponse),
    } as Response);

    render(<AddressExplorer />);

    const input = screen.getByPlaceholderText(
      'Enter Verus address (R9vqQz8...) or VerusID (verus@) - Note: VerusID requires identity APIs'
    );
    const button = screen.getByText('MagnifyingGlass');

    fireEvent.change(input, { target: { value: 'invalid_address' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Invalid address format')).toBeInTheDocument();
    });
  });

  it('displays copy buttons for VerusID and primary address', async () => {
    const mockVerusIDData = {
      success: true,
      data: {
        identity: {
          name: 'test@',
          primaryaddresses: ['R9vqQz8primary123'],
          identityaddress: 'R9vqQz8identity123',
        },
      },
    };

    const mockAddressData = {
      success: true,
      data: {
        address: 'R9vqQz8primary123',
        balance: {
          balance: 2.0,
          received: 15.0,
          sent: 13.0,
          txcount: 5,
        },
        utxos: [],
        transactions: [],
      },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVerusIDData),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAddressData),
      } as Response);

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(() => Promise.resolve()),
      },
    });

    render(<AddressExplorer />);

    const input = screen.getByPlaceholderText(
      'Enter Verus address (R9vqQz8...) or VerusID (verus@) - Note: VerusID requires identity APIs'
    );
    const button = screen.getByText('MagnifyingGlass');

    fireEvent.change(input, { target: { value: 'test@' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('test@')).toBeInTheDocument();
      expect(screen.getByText('Copy VerusID')).toBeInTheDocument();
      expect(screen.getByText('Copy Address')).toBeInTheDocument();
    });
  });

  it('validates address format before searching', async () => {
    render(<AddressExplorer />);

    const input = screen.getByPlaceholderText(
      'Enter Verus address (R9vqQz8...) or VerusID (verus@) - Note: VerusID requires identity APIs'
    );
    const button = screen.getByText('MagnifyingGlass');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(button);

    // Should not make any fetch calls for empty input
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles keyboard events for search', async () => {
    const mockAddressData = {
      success: true,
      data: {
        balance: 1.5,
        received: 10.0,
        sent: 8.5,
        txcount: 5,
      },
    };

    // Mock all API calls (address, transactions, utxos)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAddressData),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      } as Response);

    render(<AddressExplorer />);

    const input = screen.getByPlaceholderText(
      'Enter Verus address (R9vqQz8...) or VerusID (verus@) - Note: VerusID requires identity APIs'
    );

    fireEvent.change(input, { target: { value: 'R9vqQz8test123' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledWith('/api/address/R9vqQz8test123');
      },
      { timeout: 3000 }
    );

    await waitFor(
      () => {
        expect(screen.getByText('Address Details')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
