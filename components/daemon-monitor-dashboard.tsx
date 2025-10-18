'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  HardDrives,
  Network,
  Database,
  Clock,
  Warning,
  CheckCircle,
  XCircle,
  ArrowsClockwise,
  TrendUp,
  HardDrive,
  Lightning,
} from '@phosphor-icons/react';

interface DaemonStats {
  lastUpdate: number;
  blockchain: {
    chain: string;
    blocks: number;
    headers: number;
    difficulty: number;
    verificationProgress: number;
    sizeOnDisk: number;
    pruned: boolean;
    commitments: number;
  } | null;
  network: {
    version: number;
    subversion: string;
    connections: number;
    networkActive: boolean;
    relayFee: number;
  } | null;
  mining: {
    blocks: number;
    difficulty: number;
    networkHashPS: number;
    warnings: string;
  } | null;
  mempool: {
    size: number;
    bytes: number;
    usage: number;
    maxMempool: number;
    mempoolMinFee: number;
  } | null;
  system: {
    uptime: number;
    memoryInfo: any;
    timestamp: number;
  } | null;
  syncProgress: {
    percentage: number;
    blocksBehind: number;
    estimatedTimeRemaining: number;
    isSyncing: boolean;
  } | null;
  networkHealth: {
    connections: number;
    isHealthy: boolean;
    status: 'healthy' | 'degraded' | 'unhealthy';
  } | null;
  mempoolHealth: {
    size: number;
    usagePercent: number;
    isHealthy: boolean;
    status: 'healthy' | 'degraded' | 'unhealthy';
  } | null;
  collectionTime: number;
  dataAge: number;
  isStale: boolean;
}

export function DaemonMonitorDashboard() {
  const [stats, setStats] = useState<DaemonStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/daemon-monitor');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
        setLastRefresh(new Date());
      } else {
        setError(data.error || 'Failed to fetch daemon stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <Warning className="h-4 w-4 text-verus-teal" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  if (loading && !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrives className="h-5 w-5" />
            Remote Daemon Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <ArrowsClockwise className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading daemon statistics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrives className="h-5 w-5" />
            Remote Daemon Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-600">
            <XCircle className="h-6 w-6" />
            <span className="ml-2">{error}</span>
          </div>
          <div className="mt-4 text-center">
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrives className="h-5 w-5" />
            Remote Daemon Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No daemon monitoring data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HardDrives className="h-5 w-5" />
              Remote Daemon Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              {stats.isStale && (
                <Badge
                  variant="outline"
                  className="text-yellow-600 border-yellow-300"
                >
                  <Warning className="h-3 w-3 mr-1" />
                  Stale Data
                </Badge>
              )}
              <button
                onClick={fetchStats}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <ArrowsClockwise
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>
          {lastRefresh && (
            <p className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Blockchain Status */}
      {stats.blockchain && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Blockchain Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Chain</p>
                <p className="text-lg font-semibold">
                  {stats.blockchain.chain}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Blocks</p>
                <p className="text-lg font-semibold">
                  {formatNumber(stats.blockchain.blocks)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Headers</p>
                <p className="text-lg font-semibold">
                  {formatNumber(stats.blockchain.headers)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Difficulty</p>
                <p className="text-lg font-semibold">
                  {stats.blockchain.difficulty.toExponential(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Size on Disk</p>
                <p className="text-lg font-semibold">
                  {formatBytes(stats.blockchain.sizeOnDisk)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Commitments</p>
                <p className="text-lg font-semibold">
                  {formatNumber(stats.blockchain.commitments)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Progress */}
      {stats.syncProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendUp className="h-5 w-5" />
              Sync Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">
                    Verification Progress
                  </span>
                  <span className="text-sm text-gray-500">
                    {stats.syncProgress.percentage.toFixed(2)}%
                  </span>
                </div>
                <Progress
                  value={stats.syncProgress.percentage}
                  className="h-2"
                />
              </div>

              {stats.syncProgress.isSyncing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Blocks Behind</p>
                    <p className="text-lg font-semibold">
                      {formatNumber(stats.syncProgress.blocksBehind)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Est. Time Remaining</p>
                    <p className="text-lg font-semibold">
                      {stats.syncProgress.estimatedTimeRemaining.toFixed(1)}{' '}
                      minutes
                    </p>
                  </div>
                </div>
              )}

              {!stats.syncProgress.isSyncing && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Fully Synced!</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Network & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Health */}
        {stats.networkHealth && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Network Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge className={getStatusColor(stats.networkHealth.status)}>
                    {getStatusIcon(stats.networkHealth.status)}
                    <span className="ml-1 capitalize">
                      {stats.networkHealth.status}
                    </span>
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Connections</p>
                  <p className="text-2xl font-bold">
                    {stats.networkHealth.connections}
                  </p>
                </div>
                {stats.network && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Version</p>
                      <p className="font-medium">{stats.network.version}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Relay Fee</p>
                      <p className="font-medium">
                        {stats.network.relayFee} VRSC
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mempool Health */}
        {stats.mempoolHealth && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Mempool Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge className={getStatusColor(stats.mempoolHealth.status)}>
                    {getStatusIcon(stats.mempoolHealth.status)}
                    <span className="ml-1 capitalize">
                      {stats.mempoolHealth.status}
                    </span>
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Transactions</p>
                  <p className="text-2xl font-bold">
                    {formatNumber(stats.mempoolHealth.size)}
                  </p>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Usage</span>
                    <span className="text-sm text-gray-500">
                      {stats.mempoolHealth.usagePercent.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={stats.mempoolHealth.usagePercent}
                    className="h-2"
                  />
                </div>
                {stats.mempool && (
                  <div className="text-sm">
                    <p className="text-gray-500">Size</p>
                    <p className="font-medium">
                      {formatBytes(stats.mempool.bytes)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* System Information */}
      {stats.system && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Uptime</p>
                <p className="text-lg font-semibold">
                  {formatTime(stats.system.uptime)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Collection Time</p>
                <p className="text-lg font-semibold">
                  {stats.collectionTime}ms
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data Age</p>
                <p className="text-lg font-semibold">
                  {Math.round(stats.dataAge / 1000)}s
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
