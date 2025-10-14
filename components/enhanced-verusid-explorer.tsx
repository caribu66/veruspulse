'use client';

import { useState, useEffect } from 'react';
// import { StakeRewardsDashboard } from './stake-rewards-dashboard'; // Disabled
import {
  Users,
  User,
  Shield,
  Clock,
  Hash,
  Copy,
  Check,
  Search,
  AlertCircle,
  Info,
  Key,
  Globe,
  Lock,
  Unlock,
  TrendingUp,
  Eye,
  Star,
  Filter,
  SortAsc,
  SortDesc,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Wallet,
  Activity,
  Award,
  Zap,
  Database,
  Network,
} from 'lucide-react';

interface VerusID {
  name: string;
  identityaddress: string;
  primaryaddresses: string[];
  minimumsignatures: number;
  parent: string;
  canrevoke: boolean;
  privateaddress: string;
  contentmap: Record<string, any>;
  revocationauthority: string;
  recoveryauthority: string;
  timelock: number;
  flags: number;
  version: number;
  txid: string;
  height: number;
  status: string;
}

interface VerusIDBalance {
  verusid: string;
  totalBalance: number;
  totalReceived: number;
  totalSent: number;
  primaryAddresses: string[];
  addressDetails: Array<{
    address: string;
    balance: number;
    received: number;
    sent: number;
    isIdentityAddress?: boolean;
    error?: string;
  }>;
  friendlyName: string;
  identityAddress: string;
}

interface TrendingIdentity {
  name: string;
  balance: number;
  transactions: number;
  lastActivity: number;
  status: string;
}

export function VerusIDExplorer() {
  const [identity, setIdentity] = useState('');
  const [verusID, setVerusID] = useState<VerusID | null>(null);
  const [resolvedAuthorities, setResolvedAuthorities] = useState<{
    revocation?: string;
    recovery?: string;
    parent?: string;
  }>({});
  const [identityHistory, setIdentityHistory] = useState<any | null>(null);
  const [balance, setBalance] = useState<VerusIDBalance | null>(null);
  const [trendingIdentities, setTrendingIdentities] = useState<
    TrendingIdentity[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'browse' | 'trending'>(
    'search'
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['overview'])
  );
  const [sortBy, setSortBy] = useState<'balance' | 'activity' | 'name'>(
    'balance'
  );

  // Load trending identities on mount
  useEffect(() => {
    loadTrendingIdentities();
  }, []);

  const loadTrendingIdentities = async () => {
    try {
      // Mock trending data - in real implementation, this would come from an API
      setTrendingIdentities([
        {
          name: '@alice',
          balance: 12500000000,
          transactions: 45,
          lastActivity: Date.now() - 3600000,
          status: 'active',
        },
        {
          name: '@bob',
          balance: 8900000000,
          transactions: 32,
          lastActivity: Date.now() - 7200000,
          status: 'active',
        },
        {
          name: '@charlie',
          balance: 15600000000,
          transactions: 67,
          lastActivity: Date.now() - 1800000,
          status: 'active',
        },
        {
          name: '@diana',
          balance: 2340000000,
          transactions: 23,
          lastActivity: Date.now() - 10800000,
          status: 'active',
        },
      ]);
    } catch (error) {
      console.error('Failed to load trending identities:', error);
    }
  };

  const fetchBalance = async (verusid: string) => {
    try {
      setBalanceLoading(true);
      console.log('Fetching balance for VerusID:', verusid);
      const response = await fetch('/api/verusid-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verusid }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Balance API response:', result);

      if (result.success && result.data) {
        setBalance(result.data);
      } else {
        console.error(
          'Error fetching balance:',
          result.error || 'Unknown error'
        );
        setBalance(null);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  const searchIdentity = async () => {
    if (!identity.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/verusid-lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identity: identity.trim() }),
      });

      const result = await response.json();

      if (result.success && result.data && result.data.identity) {
        const apiIdentity = result.data.identity;
        const core = apiIdentity.identity || {};

        const flattened: VerusID = {
          name:
            apiIdentity.friendlyname ||
            apiIdentity.fullyqualifiedname ||
            core.name ||
            '',
          identityaddress: core.identityaddress || '',
          primaryaddresses: core.primaryaddresses || [],
          minimumsignatures:
            typeof core.minimumsignatures === 'number'
              ? core.minimumsignatures
              : 0,
          parent: core.parent || '',
          canrevoke: Boolean(core.revocationauthority),
          privateaddress: core.privateaddress || '',
          contentmap: core.contentmap || {},
          revocationauthority: core.revocationauthority || '',
          recoveryauthority: core.recoveryauthority || '',
          timelock: typeof core.timelock === 'number' ? core.timelock : 0,
          flags: typeof core.flags === 'number' ? core.flags : 0,
          version: typeof core.version === 'number' ? core.version : 0,
          txid: apiIdentity.txid || '',
          height:
            typeof apiIdentity.blockheight === 'number'
              ? apiIdentity.blockheight
              : (apiIdentity.height as number) || 0,
          status: apiIdentity.status || '',
        };

        setVerusID(flattened);
        setIdentityHistory(result.data.history || null);

        // Fetch balance information
        const balanceVerusID = flattened.name || identity.trim();
        await fetchBalance(balanceVerusID);

        // Resolve authority addresses to names in the background
        void (async () => {
          try {
            const toResolve: Array<{
              key: 'revocation' | 'recovery' | 'parent';
              address?: string;
            }> = [
              { key: 'revocation', address: core.revocationauthority },
              { key: 'recovery', address: core.recoveryauthority },
              { key: 'parent', address: core.parent },
            ];

            const results = await Promise.all(
              toResolve.map(async item => {
                if (!item.address) return { key: item.key, name: undefined };
                try {
                  const res = await fetch(
                    `/api/verus-identity/${item.address}`
                  );
                  const json = await res.json();
                  const friendly = json?.data?.identity?.friendlyname;
                  const fqn = json?.data?.identity?.fullyqualifiedname;
                  const internal = json?.data?.identity?.identity?.name;
                  const name = friendly || fqn || internal;
                  return { key: item.key, name };
                } catch {
                  return { key: item.key, name: undefined };
                }
              })
            );

            const mapped: {
              revocation?: string;
              recovery?: string;
              parent?: string;
            } = {};
            for (const r of results) {
              if (r.key === 'revocation') mapped.revocation = r.name;
              if (r.key === 'recovery') mapped.recovery = r.name;
              if (r.key === 'parent') mapped.parent = r.name;
            }
            setResolvedAuthorities(mapped);
          } catch {
            // ignore resolution errors
          }
        })();
      } else {
        setError(result.error || 'Identity not found');
      }
    } catch (err) {
      setError('Network error while fetching identity');
      console.error('Error fetching identity:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatVRSC = (amount: number) => {
    // Balance API now returns VRSC values directly, no conversion needed
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M VRSC`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K VRSC`;
    } else if (amount >= 1) {
      return `${amount.toFixed(6)} VRSC`;
    } else {
      return `${amount.toFixed(8)} VRSC`;
    }
  };

  const formatVRSCShort = (amount: number) => {
    // Balance API now returns VRSC values directly, no conversion needed
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    } else if (amount >= 1) {
      return `${amount.toFixed(2)}`;
    } else {
      return `${amount.toFixed(4)}`;
    }
  };

  const getStatusColor = (status?: unknown) => {
    const normalized =
      typeof status === 'string'
        ? status.toLowerCase()
        : String(status ?? '').toLowerCase();
    switch (normalized) {
      case 'active':
        return 'text-green-400';
      case 'revoked':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status?: unknown) => {
    const normalized =
      typeof status === 'string'
        ? status.toLowerCase()
        : String(status ?? '').toLowerCase();
    switch (normalized) {
      case 'active':
        return <Unlock className="h-4 w-4" />;
      case 'revoked':
        return <Lock className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const isSectionExpanded = (section: string) => expandedSections.has(section);

  return (
    <div className="space-y-6 text-white">
      {/* Enhanced Header with Tabs */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold flex items-center">
              <Users className="h-8 w-8 mr-3 text-purple-400" />
              VerusID Explorer
            </h2>
            <p className="text-blue-200 text-sm mt-1">
              Explore VerusID identities and their associated addresses
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('search')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  activeTab === 'search'
                    ? 'bg-blue-500 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
              </button>
              <button
                onClick={() => setActiveTab('browse')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  activeTab === 'browse'
                    ? 'bg-blue-500 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Eye className="h-4 w-4" />
                <span>Browse</span>
              </button>
              <button
                onClick={() => setActiveTab('trending')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  activeTab === 'trending'
                    ? 'bg-blue-500 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Trending</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Interface */}
        {activeTab === 'search' && (
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={identity}
                onChange={e => setIdentity(e.target.value)}
                placeholder="Enter VerusID (e.g., @username)"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={e => e.key === 'Enter' && searchIdentity()}
              />
            </div>
            <button
              onClick={searchIdentity}
              disabled={loading || !identity.trim()}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="h-4 w-4" />
              <span>{loading ? 'Searching...' : 'Search'}</span>
            </button>
          </div>
        )}

        {/* Trending Identities */}
        {activeTab === 'trending' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Trending VerusIDs</h3>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-blue-300" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white"
                >
                  <option value="balance">Balance</option>
                  <option value="activity">Activity</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trendingIdentities.map((identity, index) => (
                <div
                  key={index}
                  className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => {
                    setIdentity(identity.name);
                    searchIdentity();
                    setActiveTab('search');
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-purple-400" />
                      <span className="font-medium">{identity.name}</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          identity.status === 'active'
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-gray-500/20 text-gray-300'
                        }`}
                      >
                        {identity.status}
                      </span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-blue-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-blue-200">Balance</div>
                      <div className="font-semibold text-green-400">
                        {formatVRSCShort(identity.balance)}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-200">Transactions</div>
                      <div className="font-semibold text-blue-300">
                        {identity.transactions}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Browse Interface */}
        {activeTab === 'browse' && (
          <div className="text-center py-12">
            <Database className="h-16 w-16 text-blue-300 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">
              Browse All Identities
            </h3>
            <p className="text-blue-200 mb-6">
              Browse through all registered VerusIDs on the network
            </p>
            <button className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
              Load All Identities
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {verusID && (
        <div className="space-y-6">
          {/* Identity Header Card */}
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-purple-500/30">
                  <Users className="h-8 w-8 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2">
                    {verusID.name}
                  </h3>
                  <div className="flex items-center space-x-4">
                    <div
                      className={`flex items-center space-x-2 ${getStatusColor(verusID.status)}`}
                    >
                      {getStatusIcon(verusID.status)}
                      <span className="font-medium capitalize">
                        {verusID.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-blue-200">
                      <Hash className="h-4 w-4" />
                      <span>Block #{verusID.height}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyToClipboard(verusID.name, 'identity')}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {copied === 'identity' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span>Copy Identity</span>
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-blue-200 text-sm mb-1">
                  Identity Address
                </div>
                <div className="text-white font-mono text-sm break-all">
                  <a
                    className="underline decoration-blue-400/60 hover:decoration-blue-400"
                    href={`/address/${verusID.identityaddress}`}
                    title="Open identity address"
                  >
                    {verusID.identityaddress.slice(0, 20)}...
                  </a>
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-blue-200 text-sm mb-1">Transaction ID</div>
                <div className="text-white font-mono text-sm break-all">
                  <a
                    className="underline decoration-blue-400/60 hover:decoration-blue-400"
                    href={`/tx/${verusID.txid}`}
                    title="Open transaction"
                  >
                    {verusID.txid.slice(0, 20)}...
                  </a>
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-blue-200 text-sm mb-1">Version</div>
                <div className="text-white font-semibold">
                  {verusID.version}
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-blue-200 text-sm mb-1">
                  Minimum Signatures
                </div>
                <div className="text-white font-semibold">
                  {verusID.minimumsignatures}
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Sections */}
          <div className="space-y-4">
            {/* Balance Section */}
            {balance && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <button
                  onClick={() => toggleSection('balance')}
                  className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Wallet className="h-6 w-6 text-green-400" />
                    <h4 className="text-xl font-semibold text-white">
                      VRSC Balance
                    </h4>
                    {balanceLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                  </div>
                  {isSectionExpanded('balance') ? (
                    <ChevronDown className="h-5 w-5 text-blue-300" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-blue-300" />
                  )}
                </button>
                {isSectionExpanded('balance') && (
                  <div className="px-6 pb-6 border-t border-white/10">
                    <div className="space-y-6 pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-400">
                            {formatVRSC(balance.totalBalance)}
                          </div>
                          <div className="text-sm text-blue-200">
                            Current Balance
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-semibold text-blue-300">
                            {formatVRSC(balance.totalReceived)}
                          </div>
                          <div className="text-sm text-blue-200">
                            Total Received
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-semibold text-red-300">
                            {formatVRSC(balance.totalSent)}
                          </div>
                          <div className="text-sm text-blue-200">
                            Total Sent
                          </div>
                        </div>
                      </div>

                      {balance.addressDetails && balance.addressDetails.length > 0 && (
                        <div>
                          <div className="text-sm text-blue-200 mb-4 font-medium">
                            Address Breakdown:
                          </div>
                          <div className="space-y-3">
                            {balance.addressDetails.map((addr, index) => (
                              <div
                                key={index}
                                className={`flex justify-between items-center rounded-lg p-4 ${
                                  addr.isIdentityAddress
                                    ? 'bg-green-500/20 border border-green-400/30'
                                    : 'bg-white/5'
                                }`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <div className="text-white font-mono text-sm break-all">
                                      {addr.address}
                                    </div>
                                    {addr.isIdentityAddress && (
                                      <span className="px-2 py-1 bg-green-500/30 text-green-300 text-xs rounded-full">
                                        I-Address
                                      </span>
                                    )}
                                  </div>
                                  {addr.error && (
                                    <div className="text-red-400 text-xs mt-1">
                                      Error: {addr.error}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <div
                                    className={`font-semibold ${
                                      addr.isIdentityAddress
                                        ? 'text-green-300'
                                        : 'text-green-400'
                                    }`}
                                  >
                                    {formatVRSC(addr.balance)}
                                  </div>
                                  <div className="text-xs text-blue-200">
                                    {formatVRSCShort(addr.received)} received
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Identity Properties Section */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
              <button
                onClick={() => toggleSection('properties')}
                className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Key className="h-6 w-6 text-blue-400" />
                  <h4 className="text-xl font-semibold text-white">
                    Identity Properties
                  </h4>
                </div>
                {isSectionExpanded('properties') ? (
                  <ChevronDown className="h-5 w-5 text-blue-300" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-blue-300" />
                )}
              </button>
              {isSectionExpanded('properties') && (
                <div className="px-6 pb-6 border-t border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-blue-200">Can Revoke:</span>
                        <span className="text-white">
                          {verusID.canrevoke ? (
                            <span className="flex items-center space-x-1 text-green-400">
                              <Check className="h-4 w-4" />
                              <span>Yes</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 text-red-400">
                              <AlertCircle className="h-4 w-4" />
                              <span>No</span>
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-200">Time Lock:</span>
                        <span className="text-white">{verusID.timelock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-200">Flags:</span>
                        <span className="text-white">{verusID.flags}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-blue-200">Height:</span>
                        <span className="text-white">{verusID.height}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-200">Version:</span>
                        <span className="text-white">{verusID.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-200">
                          Minimum Signatures:
                        </span>
                        <span className="text-white">
                          {verusID.minimumsignatures}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Authorities Section */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
              <button
                onClick={() => toggleSection('authorities')}
                className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="h-6 w-6 text-yellow-400" />
                  <h4 className="text-xl font-semibold text-white">
                    Authorities
                  </h4>
                </div>
                {isSectionExpanded('authorities') ? (
                  <ChevronDown className="h-5 w-5 text-blue-300" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-blue-300" />
                )}
              </button>
              {isSectionExpanded('authorities') && (
                <div className="px-6 pb-6 border-t border-white/10">
                  <div className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-blue-200 mb-2 font-medium">
                          Revocation Authority
                        </div>
                        <div className="text-white text-sm break-all">
                          {resolvedAuthorities.revocation ? (
                            <div className="space-y-1">
                              <div className="font-medium">
                                {resolvedAuthorities.revocation}
                              </div>
                              {verusID.revocationauthority && (
                                <div className="font-mono text-blue-200/80 text-xs">
                                  {verusID.revocationauthority}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono">
                              {verusID.revocationauthority || 'None'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-blue-200 mb-2 font-medium">
                          Recovery Authority
                        </div>
                        <div className="text-white text-sm break-all">
                          {resolvedAuthorities.recovery ? (
                            <div className="space-y-1">
                              <div className="font-medium">
                                {resolvedAuthorities.recovery}
                              </div>
                              {verusID.recoveryauthority && (
                                <div className="font-mono text-blue-200/80 text-xs">
                                  {verusID.recoveryauthority}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono">
                              {verusID.recoveryauthority || 'None'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-blue-200 mb-2 font-medium">
                          Parent
                        </div>
                        <div className="text-white text-sm break-all">
                          {resolvedAuthorities.parent ? (
                            <div className="space-y-1">
                              <div className="font-medium">
                                {resolvedAuthorities.parent}
                              </div>
                              {verusID.parent && (
                                <div className="font-mono text-blue-200/80 text-xs">
                                  {verusID.parent}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono">
                              {verusID.parent || 'Root'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Associated Addresses Section */}
            {verusID.primaryaddresses &&
              verusID.primaryaddresses.length > 0 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                  <button
                    onClick={() => toggleSection('addresses')}
                    className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Globe className="h-6 w-6 text-cyan-400" />
                      <h4 className="text-xl font-semibold text-white">
                        Associated Addresses
                      </h4>
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                        {verusID.primaryaddresses.length}
                      </span>
                    </div>
                    {isSectionExpanded('addresses') ? (
                      <ChevronDown className="h-5 w-5 text-blue-300" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-blue-300" />
                    )}
                  </button>
                  {isSectionExpanded('addresses') && (
                    <div className="px-6 pb-6 border-t border-white/10">
                      <div className="space-y-3 pt-6">
                        {verusID.primaryaddresses.map((address, index) => (
                          <div
                            key={index}
                            className="bg-white/5 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-white font-mono text-sm break-all flex-1">
                                {address}
                              </div>
                              <button
                                onClick={() =>
                                  copyToClipboard(address, `address-${index}`)
                                }
                                className="flex items-center space-x-1 px-3 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors ml-4"
                              >
                                {copied === `address-${index}` ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                                <span className="text-xs">Copy</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* Staking Analytics Section - Disabled */}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <div>
              <div className="text-red-400 font-semibold text-lg">Error</div>
              <div className="text-red-300 text-sm mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
