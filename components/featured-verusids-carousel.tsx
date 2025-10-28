'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  UsersThree,
  TrendUp,
  Medal,
  Star,
  CaretLeft,
  CaretRight,
  Crown,
  Lightning,
  Pulse,
  ArrowRight,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useLocalStorageCache } from '@/lib/hooks/use-local-storage-cache';
import { CarouselCardSkeleton } from './skeleton-loader';

interface FeaturedVerusID {
  id: string;
  name: string;
  friendlyName: string;
  iAddress: string;
  category: 'top-staker' | 'most-active' | 'new' | 'notable';
  stats: {
    totalStaked?: number;
    stakingRewards?: number;
    transactions?: number;
    registeredDate?: string;
    achievements?: number;
  };
  badge?: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  };
}

interface FeaturedVerusIDsCarouselProps {
  autoPlay?: boolean;
  interval?: number;
}

export function FeaturedVerusIDsCarousel({
  autoPlay = true,
  interval = 5000,
}: FeaturedVerusIDsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [featuredIDs, setFeaturedIDs] = useState<FeaturedVerusID[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Cache for featured IDs
  const { cachedData, saveToCache } = useLocalStorageCache<FeaturedVerusID[]>(
    'featured_verusids',
    { ttl: 300000, version: '1.0' } // 5 minute cache
  );

  // Fetch featured VerusIDs
  const fetchFeaturedIDs = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch top stakers from leaderboard
      const leaderboardRes = await fetch(
        '/api/verusids/staking-leaderboard?limit=10'
      );
      const leaderboardData = await leaderboardRes.json();

      // Fetch recently registered IDs
      const browseRes = await fetch(
        '/api/verusids/browse?limit=20&sort=newest'
      );
      const browseData = await browseRes.json();

      const featured: FeaturedVerusID[] = [];

      // Add top stakers
      if (leaderboardData?.data?.leaderboard) {
        leaderboardData.data.leaderboard
          .slice(0, 5)
          .forEach((id: any, index: number) => {
            featured.push({
              id: id.identityaddress || id.iaddress,
              name: id.name || id.identity_name || 'Unknown',
              friendlyName: id.friendlyname || `${id.name}@`,
              iAddress: id.identityaddress || id.iaddress,
              category: 'top-staker',
              stats: {
                totalStaked: id.total_stakes || id.totalStakes || 0,
                stakingRewards: id.total_rewards || id.totalRewards || 0,
                achievements: id.achievements?.length || 0,
              },
              badge:
                index === 0
                  ? {
                      label: '#1 Staker',
                      icon: Crown,
                      color: 'bg-verus-teal text-black',
                    }
                  : index === 1
                    ? {
                        label: '#2 Staker',
                        icon: Medal,
                        color: 'bg-gray-300 text-gray-800',
                      }
                    : index === 2
                      ? {
                          label: '#3 Staker',
                          icon: Medal,
                          color: 'bg-verus-cyan text-white',
                        }
                      : {
                          label: 'Top Staker',
                          icon: TrendUp,
                          color: 'bg-blue-500 text-white',
                        },
            });
          });
      }

      // Add newly registered IDs
      if (browseData?.data?.identities) {
        browseData.data.identities.slice(0, 3).forEach((id: any) => {
          featured.push({
            id: id.identityaddress || id.iaddress,
            name: id.name || id.identity_name || 'Unknown',
            friendlyName: id.friendlyname || `${id.name}@`,
            iAddress: id.identityaddress || id.iaddress,
            category: 'new',
            stats: {
              registeredDate: id.blocktime
                ? new Date(id.blocktime * 1000).toLocaleDateString()
                : 'Recently',
            },
            badge: {
              label: 'NEW',
              icon: Lightning,
              color: 'bg-green-500 text-white',
            },
          });
        });
      }

      // Add some notable/active IDs (mock data if needed)
      const notableIDs = [
        {
          name: 'VerusFoundation',
          category: 'notable',
          badge: {
            label: 'Notable',
            icon: Star,
            color: 'bg-verus-blue text-white',
          },
        },
        {
          name: 'VerusCommunity',
          category: 'most-active',
          badge: {
            label: 'Active',
            icon: Pulse,
            color: 'bg-cyan-500 text-white',
          },
        },
      ];

      setFeaturedIDs(featured.length > 0 ? featured : []);
      saveToCache(featured); // Cache results
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  }, [saveToCache]);

  // Load from cache first
  useEffect(() => {
    if (cachedData && cachedData.length > 0) {
      setFeaturedIDs(cachedData);
      setIsLoading(false);
    }
  }, [cachedData]);

  // Initial fetch
  useEffect(() => {
    fetchFeaturedIDs();
  }, [fetchFeaturedIDs]);

  // Auto-play carousel
  useEffect(() => {
    if (!autoPlay || isPaused || featuredIDs.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % featuredIDs.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, isPaused, interval, featuredIDs.length]);

  // Navigation handlers
  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % featuredIDs.length);
  }, [featuredIDs.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex(
      prev => (prev - 1 + featuredIDs.length) % featuredIDs.length
    );
  }, [featuredIDs.length]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  if (isLoading && featuredIDs.length === 0) {
    return (
      <div className="bg-gradient-to-br from-verus-blue/20 via-verus-green/20 to-verus-blue/20 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-verus-cyan/20">
              <UsersThree className="h-6 w-6 text-verus-cyan animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Featured VerusIDs
              </h3>
              <p className="text-sm text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <CarouselCardSkeleton />
        </div>
      </div>
    );
  }

  if (featuredIDs.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center">
        <UsersThree className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p className="text-gray-400">No featured VerusIDs available</p>
      </div>
    );
  }

  const currentID = featuredIDs[currentIndex];

  return (
    <div className="relative bg-gradient-to-br from-verus-blue/20 via-verus-green/20 to-verus-blue/20 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-verus-cyan/20">
              <UsersThree className="h-6 w-6 text-verus-cyan" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Featured VerusIDs
              </h3>
              <p className="text-sm text-gray-400">Community Spotlight</p>
            </div>
          </div>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Current Card */}
        <div
          ref={carouselRef}
          className="p-8"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="relative">
            {/* Badge */}
            {currentID.badge && (
              <div
                className={`absolute -top-4 -right-4 ${currentID.badge.color} px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg z-10`}
              >
                <currentID.badge.icon className="h-4 w-4" />
                {currentID.badge.label}
              </div>
            )}

            {/* Card Content */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all transform hover:scale-[1.02]">
              {/* Avatar/Icon */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-verus-blue to-verus-green flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                  {currentID.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <h4 className="text-2xl font-bold text-white mb-1 truncate">
                    {currentID.friendlyName}
                  </h4>
                  <p className="text-sm text-gray-400 font-mono truncate">
                    {currentID.iAddress}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {currentID.stats.totalStaked !== undefined && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">
                      Total Stakes
                    </div>
                    <div className="text-lg font-bold text-verus-cyan">
                      {currentID.stats.totalStaked.toLocaleString()}
                    </div>
                  </div>
                )}
                {currentID.stats.stakingRewards !== undefined && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Rewards</div>
                    <div className="text-lg font-bold text-green-400">
                      {currentID.stats.stakingRewards.toFixed(2)} VRSC
                    </div>
                  </div>
                )}
                {currentID.stats.achievements !== undefined && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">
                      Achievements
                    </div>
                    <div className="text-lg font-bold text-verus-teal flex items-center gap-1">
                      <Medal className="h-4 w-4" />
                      {currentID.stats.achievements}
                    </div>
                  </div>
                )}
                {currentID.stats.registeredDate && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Registered</div>
                    <div className="text-sm font-bold text-blue-400">
                      {currentID.stats.registeredDate}
                    </div>
                  </div>
                )}
              </div>

              {/* View Profile Button */}
              <Link
                href={`/verusid/${currentID.iAddress}`}
                className="group w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-verus-blue to-verus-green hover:from-verus-blue-dark hover:to-verus-green-dark text-white font-semibold rounded-xl transition-all transform hover:scale-105"
              >
                View Full Profile
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={goToPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 transition-all group"
          aria-label="Previous VerusID"
        >
          <CaretLeft className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 transition-all group"
          aria-label="Next VerusID"
        >
          <CaretRight className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Dots Indicator */}
      <div className="flex items-center justify-center gap-2 px-6 pb-6">
        {featuredIDs.map((_, index) => (
          <button
            key={index}
            onClick={() => goToIndex(index)}
            className={`transition-all ${
              index === currentIndex
                ? 'w-8 h-2 bg-verus-cyan'
                : 'w-2 h-2 bg-white/30 hover:bg-white/50'
            } rounded-full`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Category Tabs */}
      <div className="px-6 pb-6">
        <div className="flex gap-2 overflow-x-auto">
          {[
            {
              key: 'top-staker',
              label: 'Top Stakers',
              icon: Crown,
              color: 'text-verus-teal',
            },
            {
              key: 'most-active',
              label: 'Most Active',
              icon: Pulse,
              color: 'text-cyan-400',
            },
            {
              key: 'new',
              label: 'New IDs',
              icon: Lightning,
              color: 'text-green-400',
            },
            {
              key: 'notable',
              label: 'Notable',
              icon: Star,
              color: 'text-verus-blue',
            },
          ].map(({ key, label, icon: Icon, color }) => {
            const count = featuredIDs.filter(id => id.category === key).length;
            return (
              <button
                key={key}
                onClick={() => {
                  const firstIndex = featuredIDs.findIndex(
                    id => id.category === key
                  );
                  if (firstIndex >= 0) goToIndex(firstIndex);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10 hover:border-white/20 whitespace-nowrap"
              >
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm text-white">{label}</span>
                <span className="text-xs text-gray-400">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer - Explore All Link */}
      <div className="px-6 pb-6">
        <Link
          href="/?tab=verusids"
          className="group w-full flex items-center justify-center gap-2 px-4 py-3 bg-verus-blue/10 hover:bg-verus-blue/20 text-verus-blue hover:text-white rounded-lg border border-verus-blue/30 hover:border-verus-blue/60 transition-all"
        >
          <UsersThree className="h-4 w-4" />
          <span className="font-medium">Browse All VerusIDs</span>
          <ArrowSquareOut className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function FeaturedVerusIDsCompact() {
  const [featuredIDs, setFeaturedIDs] = useState<FeaturedVerusID[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTop3 = async () => {
      try {
        const res = await fetch('/api/verusids/staking-leaderboard?limit=3');
        const data = await res.json();

        if (data?.data?.leaderboard) {
          const featured = data.data.leaderboard.map(
            (id: any, index: number) => ({
              id: id.identityaddress || id.iaddress,
              name: id.name || id.identity_name || 'Unknown',
              friendlyName: id.friendlyname || `${id.name}@`,
              iAddress: id.identityaddress || id.iaddress,
              category: 'top-staker',
              stats: {
                stakingRewards: id.total_rewards || id.totalRewards || 0,
              },
              rank: index + 1,
            })
          );
          setFeaturedIDs(featured);
        }
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };

    fetchTop3();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white/5 rounded-lg p-3 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
            <div className="h-3 bg-white/10 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {featuredIDs.map((id: any, index) => (
        <Link
          key={id.id}
          href={`/verusid/${id.iAddress}`}
          className="group block bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 hover:border-verus-cyan/50 transition-all"
        >
          <div className="flex items-center gap-3">
            {/* Rank */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                index === 0
                  ? 'bg-verus-teal text-black'
                  : index === 1
                    ? 'bg-gray-300 text-gray-800'
                    : 'bg-verus-cyan text-white'
              }`}
            >
              {index + 1}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="text-white font-semibold truncate">
                {id.friendlyName}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {id.stats.stakingRewards?.toFixed(2)} VRSC earned
              </div>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-verus-cyan group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      ))}

      {/* Browse All */}
      <Link
        href="/?tab=verusids"
        className="block text-center text-sm text-verus-blue hover:text-verus-blue-light py-2 transition-colors font-medium"
      >
        Browse All VerusIDs →
      </Link>
    </div>
  );
}
