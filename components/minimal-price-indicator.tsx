'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendUp, TrendDown, WifiHigh, WifiSlash } from '@phosphor-icons/react';
import { logger } from '@/lib/utils/logger';
import { useTranslations } from 'next-intl';

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

interface MinimalPriceIndicatorProps {
  className?: string;
  refreshInterval?: number;
  maxAssets?: number;
}

export function MinimalPriceIndicator({
  className = '',
  refreshInterval = 10000, // 10 seconds for less frequent updates
  maxAssets = 3,
}: MinimalPriceIndicatorProps) {
  const tCommon = useTranslations('common');
  const [prices, setPrices] = useState<LivePriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);

  const fetchLivePrices = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/live-prices');
      const data = await response.json();

      if (data.success && data.data.prices) {
        const newPrices = data.data.prices.slice(0, maxAssets); // Limit to maxAssets
        setPrices(newPrices);
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
  }, [maxAssets]);

  useEffect(() => {
    fetchLivePrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchLivePrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchLivePrices, refreshInterval]);

  const formatPrice = (price: number | null | undefined) => {
    if (price == null || isNaN(price) || price === 0) {
      return 'N/A';
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
    return `${sign}${change.toFixed(1)}%`;
  };

  const getChangeColor = (change: number | null | undefined) => {
    if (change == null || isNaN(change)) {
      return 'text-gray-500 dark:text-white/40';
    }
    if (change > 0) return 'text-green-600 dark:text-green-400/80';
    if (change < 0) return 'text-red-600 dark:text-red-400/80';
    return 'text-gray-500 dark:text-white/40';
  };

  const getChangeIcon = (change: number | null | undefined) => {
    if (change == null || isNaN(change)) {
      return null;
    }
    if (change > 0) return <TrendUp className="h-3 w-3" />;
    if (change < 0) return <TrendDown className="h-3 w-3" />;
    return null;
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-white/40 rounded-full animate-pulse" />
        <span className="text-xs text-gray-600 dark:text-white/40">
          Loading...
        </span>
      </div>
    );
  }

  if (error || prices.length === 0) {
    return (
      <div className={`flex items-center space-x-2 ${className}`} title="Price data requires stablecoin bridges (USDC, DAI, etc.) on PBaaS chains">
        <WifiSlash className="h-3 w-3 text-gray-500 dark:text-slate-500" />
        <span className="text-xs text-gray-600 dark:text-slate-500">
          Price N/A
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Live indicator */}
      <div className="flex items-center space-x-1">
        <WifiHigh
          className={`h-3 w-3 ${isLive ? 'text-green-500 dark:text-green-400/60' : 'text-gray-400 dark:text-white/40'}`}
        />
        {isLive && (
          <div className="w-1 h-1 bg-green-500 dark:bg-green-400/60 rounded-full animate-pulse" />
        )}
      </div>

      {/* Price items */}
      <div className="flex items-center space-x-4">
        {prices.map((price, index) => {
          const isPositive = price.change24h != null && price.change24h > 0;
          const isNegative = price.change24h != null && price.change24h < 0;
          const hasPrice = price.priceUSD != null && price.priceUSD > 0;

          return (
            <div
              key={price.symbol}
              className="flex items-center space-x-1.5 group"
              title={!hasPrice ? `${price.symbol} price unavailable - awaiting stablecoin bridge data` : undefined}
            >
              {/* Symbol */}
              <span className="text-xs text-gray-600 dark:text-white/60 font-medium tracking-wide">
                {price.symbol}
              </span>

              {/* Price */}
              <span className={`text-sm font-medium ${hasPrice ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-500'}`}>
                {formatPrice(price.priceUSD)}
              </span>

              {/* Change - only show if we have a price */}
              {hasPrice && (
                <div
                  className={`flex items-center space-x-0.5 ${getChangeColor(price.change24h)}`}
                >
                  {getChangeIcon(price.change24h)}
                  <span className="text-xs font-medium">
                    {formatChange(price.change24h)}
                  </span>
                </div>
              )}

              {/* Separator (except for last item) */}
              {index < prices.length - 1 && (
                <span className="text-gray-300 dark:text-white/20 text-xs mx-1">
                  |
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
