'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  TrendUp,
  TrendDown,
  WifiHigh,
  WifiSlash,
  ArrowsClockwise,
  CurrencyDollar,
  Info,
} from '@phosphor-icons/react';
import { logger } from '@/lib/utils/logger';

interface LivePriceData {
  symbol: string;
  name: string;
  price: number;
  priceUSD: number;
  priceInVRSC?: number;
  change24h: number;
  volume24h: number;
  marketCap?: number;
  lastUpdate: number;
  source: 'rpc' | 'pbaas';
}

interface VRSCPriceSource {
  basketName: string;
  priceUSD: number;
  liquidity: number;
  method: string;
}

interface PriceAPIResponse {
  success: boolean;
  data: {
    prices: LivePriceData[];
    vrscPriceUSD: number | null;
    vrscPriceSources: VRSCPriceSource[];
    priceCalculationMethod: string;
    note: string;
  };
}

interface PBaaSPriceTickerProps {
  className?: string;
  refreshInterval?: number;
  maxAssets?: number;
}

export function PBaaSPriceTicker({
  className = '',
  refreshInterval = 30000, // 30 seconds
  maxAssets = 5,
}: PBaaSPriceTickerProps) {
  const [prices, setPrices] = useState<LivePriceData[]>([]);
  const [vrscPriceSources, setVrscPriceSources] = useState<VRSCPriceSource[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [priceChanges, setPriceChanges] = useState<Record<string, number>>({});
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const fetchPBaaSPrices = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/live-prices');
      const data: PriceAPIResponse = await response.json();

      if (data.success && data.data.prices) {
        const newPrices = data.data.prices;

        // Deduplicate by symbol to avoid duplicate keys
        const uniquePrices = Array.from(
          new Map(
            newPrices.map((price: LivePriceData) => [price.symbol, price])
          ).values()
        );

        // Track price changes for animations
        setPrices(prevPrices => {
          const changes: Record<string, number> = {};
          uniquePrices.forEach((price: LivePriceData) => {
            const oldPrice = prevPrices.find(p => p.symbol === price.symbol);
            if (oldPrice) {
              changes[price.symbol] = price.priceUSD - oldPrice.priceUSD;
            }
          });
          setPriceChanges(changes);
          return uniquePrices;
        });

        setVrscPriceSources(data.data.vrscPriceSources || []);
        setIsLive(true);

        logger.info('📊 PBaaS prices updated:', {
          count: uniquePrices.length,
          vrscPrice: data.data.vrscPriceUSD,
          sources: data.data.vrscPriceSources?.length,
        });
      } else {
        setError('Failed to fetch PBaaS prices');
        setIsLive(false);
      }
    } catch (err) {
      setError('Network error');
      setIsLive(false);
      logger.error('Failed to fetch PBaaS prices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPBaaSPrices();
  }, [fetchPBaaSPrices]);

  useEffect(() => {
    const interval = setInterval(fetchPBaaSPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPBaaSPrices, refreshInterval]);

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
    if (change == null || isNaN(change) || change === 0) {
      return null;
    }
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  const formatPriceInVRSC = (priceInVRSC: number | undefined) => {
    if (priceInVRSC == null || isNaN(priceInVRSC)) {
      return '--';
    }
    if (priceInVRSC === 1.0) {
      return '1.00 VRSC';
    }
    if (priceInVRSC >= 1) {
      return `${priceInVRSC.toFixed(2)} VRSC`;
    } else if (priceInVRSC >= 0.0001) {
      return `${priceInVRSC.toFixed(4)} VRSC`;
    } else {
      return `${priceInVRSC.toFixed(8)} VRSC`;
    }
  };

  // Sort and select top assets
  const getTopAssets = (allPrices: LivePriceData[]): LivePriceData[] => {
    // Always put VRSC first
    const vrsc = allPrices.find(p => p.symbol === 'VRSC');
    const others = allPrices.filter(p => p.symbol !== 'VRSC');

    // Sort others by USD price (as a proxy for liquidity/importance)
    // Higher priced assets typically have more liquidity
    const sortedOthers = others.sort((a, b) => {
      // Sort by price descending
      return (b.priceUSD || 0) - (a.priceUSD || 0);
    });

    // Take VRSC + top (maxAssets - 1) others
    const topAssets = vrsc
      ? [vrsc, ...sortedOthers.slice(0, maxAssets - 1)]
      : sortedOthers.slice(0, maxAssets);
    return topAssets;
  };

  if (loading) {
    return (
      <div
        className={`pbaas-price-ticker-container w-full bg-white dark:bg-slate-900 border-y border-slate-300 dark:border-slate-700 py-4 md:py-6 ${className}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center space-x-2">
            <ArrowsClockwise className="h-5 w-5 animate-spin text-verus-blue" />
            <span className="text-sm text-slate-400">
              Loading PBaaS prices...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error || prices.length === 0) {
    return (
      <div
        className={`pbaas-price-ticker-container w-full bg-white dark:bg-slate-900 border-y border-slate-300 dark:border-slate-700 py-4 md:py-6 ${className}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center space-x-2">
            <WifiSlash className="h-5 w-5 text-red-400" />
            <span className="text-sm text-red-400">
              PBaaS prices unavailable - {error || 'No data'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const topAssets = getTopAssets(prices);

  return (
    <div
      className={`pbaas-price-ticker-container relative w-full bg-white dark:bg-slate-900 border-y border-slate-300 dark:border-slate-700 py-4 md:py-6 ${className}`}
    >
      {/* Live Indicator + PBaaS Badge */}
      <div className="absolute top-2 left-4 z-10 flex items-center space-x-2">
        <div className="flex items-center space-x-1.5">
          <WifiHigh
            className={`h-3.5 w-3.5 ${isLive ? 'text-green-400' : 'text-red-400'}`}
          />
          {isLive && (
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          )}
          <span className="text-xs font-medium text-slate-300 tracking-wider">
            LIVE
          </span>
        </div>
        <div className="px-2 py-0.5 rounded bg-verus-blue/20 border border-verus-blue/40">
          <span className="text-xs font-medium text-verus-blue">PBaaS</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Desktop: Grid Layout */}
        <div className="hidden md:grid md:grid-cols-5 gap-4">
          {topAssets.map((asset, index) => {
            const priceChange = priceChanges[asset.symbol] || 0;
            const isHovered = hoveredIndex === index;
            const isPositive = asset.change24h != null && asset.change24h > 0;
            const isNegative = asset.change24h != null && asset.change24h < 0;
            const changeDisplay = formatChange(asset.change24h);

            return (
              <div
                key={`${asset.symbol}-${index}`}
                className={`relative flex flex-col gap-2 px-4 py-3 rounded-xl border transition-all duration-300 cursor-pointer
                  ${isHovered ? 'scale-105 shadow-lg border-verus-blue/60 bg-slate-800' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50'}
                  ${priceChange !== 0 ? 'animate-price-glow' : ''}`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Header: Symbol + Icon */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CurrencyDollar className="h-5 w-5 text-verus-blue" />
                    <span className="text-sm font-bold text-white tracking-wide">
                      {asset.symbol}
                    </span>
                  </div>
                  {asset.source === 'pbaas' && (
                    <div className="w-2 h-2 bg-verus-blue rounded-full animate-pulse" />
                  )}
                </div>

                {/* USD Price */}
                <div className="relative">
                  <span
                    className={`text-2xl font-bold transition-all duration-300 ${
                      priceChange > 0
                        ? 'text-green-400'
                        : priceChange < 0
                          ? 'text-red-400'
                          : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {formatPrice(asset.priceUSD)}
                  </span>
                </div>

                {/* 24h Change */}
                {changeDisplay ? (
                  <div
                    className={`flex items-center space-x-1 text-sm ${
                      isPositive
                        ? 'text-green-400'
                        : isNegative
                          ? 'text-red-400'
                          : 'text-gray-600 dark:text-slate-400'
                    }`}
                  >
                    {isPositive && <TrendUp className="h-4 w-4" />}
                    {isNegative && <TrendDown className="h-4 w-4" />}
                    <span className="font-medium">{changeDisplay}</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-slate-500">
                    24h: N/A
                  </div>
                )}

                {/* Price in VRSC */}
                <div className="pt-2 border-t border-slate-300 dark:border-slate-700/50">
                  <div className="text-xs text-gray-600 dark:text-slate-400">
                    Price in VRSC
                  </div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-slate-200 mt-0.5">
                    {formatPriceInVRSC(asset.priceInVRSC)}
                  </div>
                </div>

                {/* Hover Details */}
                {isHovered && (
                  <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-slate-800 border border-verus-blue/60 rounded-lg shadow-xl z-20 text-xs">
                    <div className="font-semibold text-white mb-2">
                      {asset.name}
                    </div>
                    {asset.symbol === 'VRSC' && vrscPriceSources.length > 0 && (
                      <div className="space-y-1 text-slate-300">
                        <div className="text-slate-400 mb-1">
                          Price Sources:
                        </div>
                        {vrscPriceSources.map((source, idx) => (
                          <div key={idx} className="text-xs">
                            • {source.basketName}:{' '}
                            {formatPrice(source.priceUSD)}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-slate-400 mt-2">
                      Source: {asset.source.toUpperCase()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile: Horizontal Scroll */}
        <div className="md:hidden overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 px-2 min-w-max">
            {topAssets.map((asset, index) => {
              const priceChange = priceChanges[asset.symbol] || 0;
              const isPositive = asset.change24h != null && asset.change24h > 0;
              const isNegative = asset.change24h != null && asset.change24h < 0;
              const changeDisplay = formatChange(asset.change24h);

              return (
                <div
                  key={`${asset.symbol}-mobile-${index}`}
                  className={`flex flex-col gap-2 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 w-[140px] flex-shrink-0
                    ${priceChange !== 0 ? 'animate-price-glow' : ''}`}
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center space-x-2">
                    <CurrencyDollar className="h-4 w-4 text-verus-blue" />
                    <span className="text-xs font-bold text-white">
                      {asset.symbol}
                    </span>
                  </div>

                  {/* USD Price */}
                  <div
                    className={`text-lg font-bold ${
                      priceChange > 0
                        ? 'text-green-400'
                        : priceChange < 0
                          ? 'text-red-400'
                          : 'text-white'
                    }`}
                  >
                    {formatPrice(asset.priceUSD)}
                  </div>

                  {/* 24h Change */}
                  {changeDisplay ? (
                    <div
                      className={`flex items-center space-x-1 text-xs ${
                        isPositive
                          ? 'text-green-400'
                          : isNegative
                            ? 'text-red-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {isPositive && <TrendUp className="h-3 w-3" />}
                      {isNegative && <TrendDown className="h-3 w-3" />}
                      <span>{changeDisplay}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">N/A</div>
                  )}

                  {/* Price in VRSC */}
                  <div className="pt-2 border-t border-slate-300 dark:border-slate-700/50">
                    <div className="text-[10px] text-slate-400">in VRSC</div>
                    <div className="text-xs font-semibold text-slate-200">
                      {formatPriceInVRSC(asset.priceInVRSC)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes price-glow {
          0% {
            box-shadow: 0 0 0 0 rgba(49, 101, 212, 0.4);
          }
          50% {
            box-shadow: 0 0 12px 0 rgba(49, 101, 212, 0.6);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(49, 101, 212, 0);
          }
        }

        .animate-price-glow {
          animation: price-glow 0.8s ease-in-out;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
