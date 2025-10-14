'use client';

import { useState, useEffect } from 'react';
import {
  Database,
  Activity,
  Users,
  Zap,
  TrendingUp,
  Globe,
  Shield,
  Clock,
  BarChart3,
  Network,
  Coins,
  Hash,
  Target,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

interface ConsolidatedData {
  blockchain: any;
  mining: any;
  mempool: any;
  network: any;
  timestamp: number;
  responseTime: number;
}

interface MetaData {
  successRate: number;
  responseTime: number;
  timestamp: number;
}

export function OptimizedNetworkDashboard() {
  const [data, setData] = useState<ConsolidatedData | null>(null);
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConsolidatedData = async () => {
    try {
      setLoading(true);
      setError(null);
      const timestamp = Date.now();

      const response = await fetch(`/api/consolidated-data?t=${timestamp}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setMeta(result.meta);
        setLastUpdate(new Date());
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (error: any) {
      console.error('Error fetching consolidated data:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsolidatedData();
    const interval = setInterval(fetchConsolidatedData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    if (!seconds || seconds < 0) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    if (seconds < 86400)
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes < 0) return 'N/A';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatHashRate = (hashRate: number) => {
    if (!hashRate || hashRate < 0) return 'N/A';
    if (hashRate === 0) return '0.00 MH/s';
    const mhRate = hashRate / 1e6;
    if (mhRate >= 1000000) return (mhRate / 1000000).toFixed(2) + 'M MH/s';
    if (mhRate >= 1000) return (mhRate / 1000).toFixed(2) + 'K MH/s';
    return mhRate.toFixed(2) + ' MH/s';
  };

  if (error) {
    return (
      <div className="space-y-8 text-white">
        <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <div>
              <h3 className="text-lg font-bold text-red-400">
                Connection Error
              </h3>
              <p className="text-red-200 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Network Dashboard</h2>
          <p className="text-blue-200 text-sm mt-1">
            Optimized blockchain analytics with consolidated data fetching
          </p>
          {meta && (
            <p className="text-green-200 text-xs mt-1">
              Success Rate: {meta.successRate.toFixed(1)}% | Response Time:{' '}
              {meta.responseTime}ms
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdate && (
            <div className="text-sm text-blue-200">
              Last updated:{' '}
              {lastUpdate instanceof Date
                ? lastUpdate.toLocaleTimeString()
                : new Date(lastUpdate as any).toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={fetchConsolidatedData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Network Status */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <Globe className="h-5 w-5 mr-2" />
          Network Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg ${data?.network?.networkactive ? 'bg-green-500/20' : 'bg-red-500/20'}`}
            >
              {data?.network?.networkactive ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div>
              <div className="text-white font-semibold">Network</div>
              <div className="text-blue-200 text-sm">
                {data?.network?.networkactive ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Network className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <div className="text-white font-semibold">Connections</div>
              <div className="text-blue-200 text-sm">
                {data?.network?.connections || 0}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Target className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-white font-semibold">Sync Progress</div>
              <div className="text-blue-200 text-sm">
                {((data?.blockchain?.verificationprogress || 0) * 100).toFixed(
                  2
                )}
                %
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Database className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-white font-semibold">Chain Size</div>
              <div className="text-blue-200 text-sm">
                {data?.blockchain
                  ? formatBytes(data.blockchain.size_on_disk)
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <Database className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {data?.blockchain?.blocks?.toLocaleString() || 'N/A'}
              </div>
              <div className="text-blue-200 text-sm font-medium">
                Block Height
              </div>
              <div className="text-blue-300 text-xs mt-1">
                Chain: {data?.blockchain?.chain || 'Loading...'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-yellow-500/20">
              <Hash className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {data?.blockchain?.difficulty
                  ? (data.blockchain.difficulty / 1e6).toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    ) + ' M'
                  : 'N/A'}
              </div>
              <div className="text-blue-200 text-sm font-medium">
                Difficulty
              </div>
              <div className="text-blue-300 text-xs mt-1">
                Mining Difficulty
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-500/20">
              <Zap className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {data?.mining?.networkhashps
                  ? formatHashRate(data.mining.networkhashps)
                  : 'N/A'}
              </div>
              <div className="text-blue-200 text-sm font-medium">Hash Rate</div>
              <div className="text-blue-300 text-xs mt-1">
                Network Hash Rate
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Activity className="h-6 w-6 text-purple-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {data?.mempool?.size || 0}
              </div>
              <div className="text-blue-200 text-sm font-medium">Mempool</div>
              <div className="text-blue-300 text-xs mt-1">
                Pending Transactions
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {meta && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Performance Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <div className="text-white font-semibold">Success Rate</div>
                <div className="text-blue-200 text-sm">
                  {meta.successRate.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <div className="text-white font-semibold">Response Time</div>
                <div className="text-blue-200 text-sm">
                  {meta.responseTime}ms
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <TrendingUp className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <div className="text-white font-semibold">Data Sources</div>
                <div className="text-blue-200 text-sm">
                  {Object.values(data || {}).filter(v => v !== null).length}/4
                  Active
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-blue-200">
            Loading consolidated data...
          </span>
        </div>
      )}
    </div>
  );
}
