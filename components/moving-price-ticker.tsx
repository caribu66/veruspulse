'use client';

/**
 * @deprecated This component has been replaced by MinimalPriceIndicator
 * for a more professional, enterprise-grade appearance.
 *
 * This component will be removed in a future version.
 * Use MinimalPriceIndicator instead.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendUp,
  TrendDown,
  WifiHigh,
  WifiSlash,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import Image from 'next/image';
import { logger } from '@/lib/utils/logger';

interface LivePriceData {
  symbol: string;
  name: string;
  price: number;
  priceUSD: number;
  change24h: number;
  volume24h: number;
  marketCap?: number;
  lastUpdate: number;
  source: 'rpc' | 'external' | 'calculated';
}

interface MovingPriceTickerProps {
  className?: string;
  refreshInterval?: number;
  showMultipleAssets?: boolean;
}

export function MovingPriceTicker({
  className = '',
  refreshInterval = 5000, // 5 seconds for more frequent updates
  showMultipleAssets = true,
}: MovingPriceTickerProps) {
  const [prices, setPrices] = useState<LivePriceData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [priceChanges, setPriceChanges] = useState<Record<string, number>>({});
  const tickerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  const fetchLivePrices = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/live-prices');
      const data = await response.json();

      if (data.success && data.data.prices) {
        const newPrices = data.data.prices;

        // Track price changes for animations
        setPrices(prevPrices => {
          const changes: Record<string, number> = {};
          newPrices.forEach((price: LivePriceData) => {
            const oldPrice = prevPrices.find(p => p.symbol === price.symbol);
            if (oldPrice) {
              changes[price.symbol] = price.priceUSD - oldPrice.priceUSD;
            }
          });
          setPriceChanges(changes);
          return newPrices;
        });

        setIsLive(true);
      } else {
        setError('Failed to fetch live prices');
        setIsLive(false);
      }
    } catch (err) {
      setError('Network error');
      setIsLive(false);
      logger.error('Failed to fetch live prices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLivePrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchLivePrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchLivePrices, refreshInterval]);

  // Auto-rotate through assets
  useEffect(() => {
    if (prices.length > 1 && showMultipleAssets) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % prices.length);
      }, 3000); // Switch every 3 seconds
      return () => clearInterval(interval);
    }
  }, [prices.length, showMultipleAssets]);

  const formatPrice = (price: number) => {
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else if (price >= 0.01) {
      return `$${price.toFixed(4)}`;
    } else {
      return `$${price.toFixed(8)}`;
    }
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-white/60';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendUp className="h-3 w-3" />;
    if (change < 0) return <TrendDown className="h-3 w-3" />;
    return null;
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <ArrowsClockwise className="h-4 w-4 animate-spin text-white/60" />
        <span className="text-sm text-white/60">Loading...</span>
      </div>
    );
  }

  if (error || prices.length === 0) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <WifiSlash className="h-4 w-4 text-red-400" />
        <span className="text-sm text-red-400">Price unavailable</span>
      </div>
    );
  }

  const currentPrice = prices[currentIndex];
  const priceChange = priceChanges[currentPrice.symbol] || 0;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Live indicator */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <WifiHigh
            className={`h-3 w-3 ${isLive ? 'text-green-400' : 'text-red-400'}`}
          />
          {isLive && (
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          )}
        </div>

        {/* Moving price display */}
        <div
          ref={tickerRef}
          className="flex items-center space-x-3 transition-all duration-500 ease-in-out"
          style={{
            transform: showMultipleAssets
              ? `translateX(-${currentIndex * 100}%)`
              : 'none',
          }}
        >
          {showMultipleAssets ? (
            // Multiple assets scrolling
            <div className="flex space-x-8 whitespace-nowrap">
              {prices.map((price, index) => (
                <div
                  key={price.symbol}
                  className="flex items-center space-x-2 min-w-max"
                >
                  <span className="text-xs text-white/70 font-medium">
                    {price.symbol}
                  </span>
                  <span
                    className={`text-sm font-bold transition-colors duration-300 ${
                      priceChanges[price.symbol] > 0
                        ? 'text-green-400'
                        : priceChanges[price.symbol] < 0
                          ? 'text-red-400'
                          : 'text-white'
                    }`}
                  >
                    {formatPrice(price.priceUSD)}
                  </span>
                  <span
                    className={`text-xs flex items-center ${getChangeColor(price.change24h)}`}
                  >
                    {getChangeIcon(price.change24h)}
                    <span className="ml-0.5">
                      {formatChange(price.change24h)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            // Single asset with animation
            <div className="flex items-center space-x-2">
              <span className="text-xs text-white/70 font-medium">
                {currentPrice.symbol}
              </span>
              <span
                className={`text-sm font-bold transition-all duration-300 ${
                  priceChange > 0
                    ? 'text-green-400 scale-105'
                    : priceChange < 0
                      ? 'text-red-400 scale-105'
                      : 'text-white'
                }`}
                style={{
                  animation:
                    priceChange !== 0 ? 'priceFlash 0.6s ease-in-out' : 'none',
                }}
              >
                {formatPrice(currentPrice.priceUSD)}
              </span>
              <span
                className={`text-xs flex items-center ${getChangeColor(currentPrice.change24h)}`}
              >
                {getChangeIcon(currentPrice.change24h)}
                <span className="ml-0.5">
                  {formatChange(currentPrice.change24h)}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes priceFlash {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes tickerScroll {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        .ticker-scroll {
          animation: tickerScroll 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
