'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Heading, Text } from '@/components/ui/typography';
import {
  TrendUp,
  Database,
  CheckCircle,
  WarningCircle,
  Info,
  ChartBar,
  Clock,
} from '@phosphor-icons/react';

interface APYQualityStats {
  totalVerusIDs: number;
  withActualData: number;
  withEstimatedData: number;
  avgCompleteness: number;
  totalStakes: number;
  stakesWithAmounts: number;
  lastUpdated: string;
}

interface VerusIDQuality {
  address: string;
  friendly_name: string;
  total_stakes: number;
  stakes_with_real_amounts: number;
  data_completeness_pct: number;
  apy_all_time: number;
  apy_calculation_method: string;
  avg_stake_amount_vrsc: number | null;
  last_calculated: string;
}

export default function APYQualityPage() {
  const [stats, setStats] = useState<APYQualityStats | null>(null);
  const [verusIDs, setVerusIDs] = useState<VerusIDQuality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'completeness' | 'stakes' | 'apy'>(
    'completeness'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchAPYQualityData();
  }, []);

  const fetchAPYQualityData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch overall stats
      const statsResponse = await fetch('/api/admin/apy-quality-stats');
      const statsData = await statsResponse.json();

      if (statsData.success) {
        setStats(statsData.data);
      }

      // Fetch VerusID details
      const verusIDsResponse = await fetch('/api/admin/apy-quality-verusids');
      const verusIDsData = await verusIDsResponse.json();

      if (verusIDsData.success) {
        setVerusIDs(verusIDsData.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch APY quality data');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceLevel = (
    completeness: number,
    stakesWithAmounts: number
  ) => {
    if (stakesWithAmounts >= 100 && completeness >= 80) {
      return {
        level: 'very-high',
        label: '🎯 Very High',
        color: 'text-green-400',
      };
    } else if (stakesWithAmounts >= 50 && completeness >= 50) {
      return { level: 'high', label: '✅ High', color: 'text-blue-400' };
    } else if (stakesWithAmounts >= 30) {
      return { level: 'medium', label: '📊 Medium', color: 'text-yellow-400' };
    } else if (stakesWithAmounts >= 10) {
      return { level: 'low', label: '📈 Low', color: 'text-orange-400' };
    } else {
      return {
        level: 'estimated',
        label: '⚠️ Estimated',
        color: 'text-gray-400',
      };
    }
  };

  const sortedVerusIDs = [...verusIDs].sort((a, b) => {
    let aValue: number, bValue: number;

    switch (sortBy) {
      case 'completeness':
        aValue = a.data_completeness_pct;
        bValue = b.data_completeness_pct;
        break;
      case 'stakes':
        aValue = a.total_stakes;
        bValue = b.total_stakes;
        break;
      case 'apy':
        aValue = a.apy_all_time;
        bValue = b.apy_all_time;
        break;
      default:
        aValue = a.data_completeness_pct;
        bValue = b.data_completeness_pct;
    }

    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  if (loading) {
    return (
      <div className="min-h-screen theme-bg-primary p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/10 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-white/5 rounded-xl"></div>
              ))}
            </div>
            <div className="h-96 bg-white/5 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen theme-bg-primary p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <WarningCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <Heading as="h2" className="text-red-400 mb-2">
              Error Loading Data
            </Heading>
            <Text className="text-gray-300">{error}</Text>
            <button
              onClick={fetchAPYQualityData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg-primary p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Heading as="h1" className="text-white mb-2">
              APY Quality Dashboard
            </Heading>
            <Text className="text-gray-300">
              Monitor the accuracy and completeness of APY calculations
            </Text>
          </div>
          <button
            onClick={fetchAPYQualityData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card variant="elevated" padding="lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Database className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {stats.totalVerusIDs.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-300">Total VerusIDs</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {stats.withActualData.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-300">
                      With Actual Data
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-500/20 rounded-lg">
                    <WarningCircle className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {stats.withEstimatedData.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-300">Estimated Only</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <ChartBar className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {stats.avgCompleteness.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-300">
                      Avg Completeness
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Progress Overview */}
        {stats && (
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendUp className="h-5 w-5" />
                Data Extraction Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">
                    Stakes with actual amounts
                  </span>
                  <span className="text-white">
                    {stats.stakesWithAmounts.toLocaleString()} /{' '}
                    {stats.totalStakes.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-1000"
                    style={{
                      width: `${(stats.stakesWithAmounts / stats.totalStakes) * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-400">
                  {(
                    (stats.stakesWithAmounts / stats.totalStakes) *
                    100
                  ).toFixed(2)}
                  % complete
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* VerusID Quality Table */}
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Info className="h-5 w-5" />
              VerusID Quality Details
            </CardTitle>
            <div className="flex gap-4 mt-4">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600"
              >
                <option value="completeness">Sort by Completeness</option>
                <option value="stakes">Sort by Total Stakes</option>
                <option value="apy">Sort by APY</option>
              </select>
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as any)}
                className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-2 text-gray-300">
                      VerusID
                    </th>
                    <th className="text-left py-3 px-2 text-gray-300">
                      Confidence
                    </th>
                    <th className="text-right py-3 px-2 text-gray-300">
                      Completeness
                    </th>
                    <th className="text-right py-3 px-2 text-gray-300">
                      Stakes
                    </th>
                    <th className="text-right py-3 px-2 text-gray-300">APY</th>
                    <th className="text-right py-3 px-2 text-gray-300">
                      Avg Stake
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVerusIDs.slice(0, 50).map(verusID => {
                    const confidence = getConfidenceLevel(
                      verusID.data_completeness_pct,
                      verusID.stakes_with_real_amounts
                    );

                    return (
                      <tr
                        key={verusID.address}
                        className="border-b border-gray-800 hover:bg-gray-800/30"
                      >
                        <td className="py-3 px-2">
                          <div className="font-mono text-white text-xs">
                            {verusID.friendly_name ||
                              verusID.address.slice(0, 16)}
                            ...
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`text-xs ${confidence.color}`}>
                            {confidence.label}
                          </span>
                        </td>
                        <td className="text-right py-3 px-2 text-white">
                          {verusID.data_completeness_pct.toFixed(1)}%
                        </td>
                        <td className="text-right py-3 px-2 text-white">
                          {verusID.total_stakes.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-2 text-white">
                          {verusID.apy_all_time.toFixed(2)}%
                        </td>
                        <td className="text-right py-3 px-2 text-white">
                          {verusID.avg_stake_amount_vrsc
                            ? `${verusID.avg_stake_amount_vrsc.toFixed(2)} VRSC`
                            : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {sortedVerusIDs.length > 50 && (
              <div className="text-center mt-4 text-gray-400 text-sm">
                Showing top 50 results. Total: {sortedVerusIDs.length} VerusIDs
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
