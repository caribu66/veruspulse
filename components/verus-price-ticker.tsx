'use client';

/**
 * @deprecated This component has been replaced by MinimalPriceIndicator
 * for a more professional, enterprise-grade appearance.
 *
 * This component will be removed in a future version.
 * Use MinimalPriceIndicator instead.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
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

interface VerusPriceTickerProps {
  className?: string;
  refreshInterval?: number;
  speed?: number;
  showControls?: boolean;
  showVolume?: boolean;
  showMarketCap?: boolean;
}

export function VerusPriceTicker({
  className = '',
  refreshInterval = 6000,
  speed = 20,
  showControls = false,
  showVolume = true,
  showMarketCap = true,
}: VerusPriceTickerProps) {
  const tCommon = useTranslations('common');
  const [prices, setPrices] = useState<LivePriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [priceChanges, setPriceChanges] = useState<Record<string, number>>({});
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    fetchLivePrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchLivePrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchLivePrices, refreshInterval]);

  const formatPrice = (price: number | null | undefined) => {
    if (price == null || isNaN(price)) {
      return '$-.--';
    }
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else if (price >= 0.01) {
      return `$${price.toFixed(4)}`;
    } else {
      return `$${price.toFixed(8)}`;
    }
  };

  const formatChange = (change: number | null | undefined) => {
    if (change == null || isNaN(change)) {
      return '--';
    }
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  const formatVolume = (volume: number | null | undefined) => {
    if (volume == null || isNaN(volume) || volume === 0) {
      return '--';
    }
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-3 ${className}`}>
        <ArrowsClockwise className="h-4 w-4 animate-spin text-gray-600 dark:text-white/60" />
        <span className="text-sm text-gray-600 dark:text-white/60 ml-2">
          Loading market data...
        </span>
      </div>
    );
  }

  if (error || prices.length === 0) {
    return (
      <div className={`flex items-center justify-center py-3 ${className}`}>
        <WifiSlash className="h-4 w-4 text-red-400" />
        <span className="text-sm text-red-400 ml-2">
          Market data unavailable
        </span>
      </div>
    );
  }

  const tickerItems = [...prices, ...prices, ...prices];

  return (
    <div
      className={`relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg ${className}`}
    >
      {/* Live indicator */}
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 flex items-center space-x-2">
        <div className="relative">
          {isLive && (
            <div className="w-2 h-2 bg-verus-green rounded-full animate-pulse" />
          )}
        </div>
        <span className="text-xs font-medium text-slate-300 tracking-wider">
          LIVE
        </span>
      </div>

      {/* Verus-style scrolling ticker */}
      <div
        ref={tickerRef}
        className="flex items-center space-x-4 whitespace-nowrap py-3 pl-16"
        style={{
          animation: isPaused
            ? 'none'
            : `tickerScroll ${(tickerItems.length * 200) / speed}s linear infinite`,
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {tickerItems.map((price, index) => {
          const priceChange = priceChanges[price.symbol] || 0;
          const isHovered = hoveredIndex === index;
          const isPositive = price.change24h != null && price.change24h > 0;
          const isNegative = price.change24h != null && price.change24h < 0;

          return (
            <div
              key={`${price.symbol}-${index}`}
              className={`flex items-center space-x-3 min-w-max px-3 py-2 rounded-md transition-all duration-300 ${
                isHovered ? 'bg-white/10 scale-105' : 'bg-white/5'
              } ${isPositive ? 'border-l-2 border-green-400/50' : isNegative ? 'border-l-2 border-red-400/50' : 'border-l-2 border-white/20'}`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                animation:
                  priceChange !== 0 ? 'priceGlow 0.6s ease-in-out' : 'none',
              }}
            >
              {/* Symbol with Verus styling */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white/90 tracking-wide">
                  {price.symbol}
                </span>
                {(isPositive || isNegative) && (
                  <div
                    className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      isPositive ? 'bg-green-400' : 'bg-red-400'
                    }`}
                  />
                )}
              </div>

              {/* Price with subtle animation */}
              <div className="relative">
                <span
                  className={`text-base font-bold transition-all duration-300 ${
                    isPositive
                      ? 'text-green-400'
                      : isNegative
                        ? 'text-red-400'
                        : 'text-white'
                  }`}
                  style={{
                    animation:
                      priceChange !== 0
                        ? 'pricePulse 0.4s ease-in-out'
                        : 'none',
                  }}
                >
                  {formatPrice(price.priceUSD)}
                </span>
              </div>

              {/* Change indicator with Verus colors */}
              <div
                className={`flex items-center space-x-1 ${
                  isPositive
                    ? 'text-green-400'
                    : isNegative
                      ? 'text-red-400'
                      : 'text-white/60'
                }`}
              >
                {isPositive && <TrendUp className="h-3 w-3" />}
                {isNegative && <TrendDown className="h-3 w-3" />}
                <span className="text-xs font-medium">
                  {formatChange(price.change24h)}
                </span>
              </div>

              {/* Volume */}
              {showVolume && price.volume24h != null && price.volume24h > 0 && (
                <div className="flex items-center space-x-1 text-xs text-white/50">
                  <span>Vol:</span>
                  <span>{formatVolume(price.volume24h)}</span>
                </div>
              )}

              {/* Market Cap */}
              {showMarketCap &&
                price.marketCap != null &&
                price.marketCap > 0 && (
                  <div className="flex items-center space-x-1 text-xs text-white/50">
                    <span>MCap:</span>
                    <span>${(price.marketCap / 1000000).toFixed(1)}M</span>
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* Verus-style CSS animations */}
      <style jsx>{`
        @keyframes tickerScroll {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        @keyframes priceGlow {
          0% {
            box-shadow: 0 0 0 0 rgba(49, 101, 212, 0.4);
          }
          50% {
            box-shadow: 0 0 8px 0 rgba(49, 101, 212, 0.6);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(49, 101, 212, 0);
          }
        }

        @keyframes pricePulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .ticker-item {
          animation: fadeInUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
