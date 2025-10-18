'use client';

import { useState, useEffect, useRef } from 'react';
// import { UnifiedStakingAnalytics } from './unified-staking-analytics'; // Removed
import {
  UsersThree,
  User,
  Shield,
  Clock,
  Hash,
  Copy,
  Check,
  MagnifyingGlass,
  WarningCircle,
  Info,
  Key,
  Globe,
  Lock,
  LockOpen,
  TrendUp,
  Eye,
  Star,
  Funnel,
  SortAscending,
  SortDescending,
  CaretDown,
  CaretRight,
  ArrowSquareOut,
  Wallet,
  Pulse,
  Medal,
  Lightning,
  Database,
  Network,
  ChartBar,
} from '@phosphor-icons/react';
import {
  formatCryptoValue,
  formatFriendlyNumber,
} from '@/lib/utils/number-formatting';
import { useApiFetch } from '@/lib/hooks/use-retryable-fetch';
import { VerusIDStakingDashboard } from './verusid-staking-dashboard';
import { VerusIDSyncStatus } from './verusid-sync-status';
import { VerusIDUTXOAnalytics } from './verusid-utxo-analytics';
import { VerusIDAchievements } from './verusid-achievements';
import { VerusIDIdentityDetails } from './verusid-identity-details';
import { Tabs, TabPanel } from './ui/tabs';

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
  const [stakingLoading, setStakingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'browse' | 'trending'>(
    'search'
  );
  const [detailsTab, setDetailsTab] = useState<
    'overview' | 'staking' | 'utxo' | 'achievements' | 'identity'
  >('overview');
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(
    new Set(['overview'])
  );
  // Start with staking hero and performance expanded by default for better UX
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['staking-hero', 'staking-performance', 'staking-overview'])
  );
  const [sortBy, setSortBy] = useState<'balance' | 'activity' | 'name'>(
    'balance'
  );
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastAutoSearched = useRef<string | null>(null);

  // API fetch helper (retryable)
  const { apiFetch } = useApiFetch();

  // Load trending identities and recent searches on mount
  useEffect(() => {
    loadTrendingIdentities();

    // Load recent searches from localStorage
    try {
      const saved = localStorage.getItem('verusid-recent-searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  }, []);

  // Auto-trigger a search when the user types an input that ends with '@' (test helpers often use this)
  useEffect(() => {
    try {
      const val = identity.trim();
      if (val && val.endsWith('@') && lastAutoSearched.current !== val) {
        lastAutoSearched.current = val;
        void searchIdentity(val);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  // Cleanup any in-flight requests when this component unmounts
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {}
        abortRef.current = null;
      }
    };
  }, []);

  // Removed debug logging - use logger for development debugging if needed

  // Update page title when VerusID changes
  useEffect(() => {
    if (verusID) {
      document.title = `${verusID.name} - VerusID Explorer`;
    } else {
      document.title = 'VerusID Explorer - VerusPulse';
    }
  }, [verusID]);

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

  const fetchBalance = async (verusid: string, signal?: AbortSignal) => {
    try {
      setBalanceLoading(true);
      console.log('Fetching balance for VerusID:', verusid);
      // Use apiFetch which has retry logic and better error handling
      const result = await apiFetch('/api/verusid-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verusid }),
        signal,
      }).catch((err: any) => {
        console.error('Balance fetch failed:', err);
        return null;
      });

      if (!result) {
        setBalance(null);
        return;
      }
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
      if ((error as any)?.name === 'AbortError') {
        // Request cancelled by user; do not update balance state
        return;
      }
      console.error('Error fetching balance:', error);
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  // Accept an optional input override to avoid stale state when triggered by key events
  const searchIdentity = async (inputOverride?: string) => {
    console.log(
      '[VerusID Debug] searchIdentity called with override:',
      inputOverride
    );
    const searchInput = (
      typeof inputOverride === 'string' ? inputOverride : identity
    ).trim();
    if (!searchInput) return;

    // Cancel any previous in-flight work
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {}
      abortRef.current = null;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      // Use apiFetch for retries; if it fails, it will throw or return null
      const result = await apiFetch('/api/verusid/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: searchInput }),
        signal: controller.signal,
      }).catch(err => {
        console.error('Lookup fetch failed:', err);
        return null;
      });

      if (!result) {
        setError('Network error while fetching identity');
        return;
      }

      if (result.success && result.data && result.data.identity) {
        const apiIdentity = result.data.identity;

        // Support multiple shapes from different APIs: prefer friendlyname, then nested identity.name
        const resolvedName =
          apiIdentity.friendlyName ||
          apiIdentity.friendlyname ||
          apiIdentity.identity?.name ||
          apiIdentity.name ||
          '';
        const resolvedIdentityAddress =
          apiIdentity.identityAddress ||
          apiIdentity.identity?.identityaddress ||
          apiIdentity.identityaddress ||
          '';
        const resolvedPrimaryAddresses =
          apiIdentity.primaryAddresses ||
          apiIdentity.identity?.primaryaddresses ||
          apiIdentity.primaryaddresses ||
          [];

        // Our API now returns a flat structure with all fields; normalize common fields
        const flattened: VerusID = {
          name: resolvedName,
          identityaddress: resolvedIdentityAddress,
          primaryaddresses: resolvedPrimaryAddresses,
          minimumsignatures: apiIdentity.minimumsignatures || 1,
          parent: apiIdentity.parent || '',
          canrevoke:
            apiIdentity.canrevoke ||
            Boolean(
              apiIdentity.identity?.revocationauthority ||
                apiIdentity.revocationauthority
            ),
          privateaddress: '',
          contentmap: apiIdentity.contentmap || {},
          revocationauthority:
            apiIdentity.revocationauthority ||
            apiIdentity.identity?.revocationauthority ||
            '',
          recoveryauthority:
            apiIdentity.recoveryauthority ||
            apiIdentity.identity?.recoveryauthority ||
            '',
          timelock: apiIdentity.timelock || 0,
          flags: apiIdentity.flags || 0,
          version: apiIdentity.version || 1,
          txid: apiIdentity.txid || '',
          height: apiIdentity.height || 0,
          status: apiIdentity.status || 'active',
        };

        setVerusID(flattened);
        setIdentityHistory(null); // Not cached yet
        setLastUpdated(new Date());

        // Save to recent searches
        const searchTerm = searchInput;
        setRecentSearches(prev => {
          const updated = [searchTerm, ...prev.filter(i => i !== searchTerm)];
          const limited = updated.slice(0, 5); // Keep last 5
          try {
            localStorage.setItem(
              'verusid-recent-searches',
              JSON.stringify(limited)
            );
          } catch (error) {
            console.error('Failed to save recent searches:', error);
          }
          return limited;
        });

        // Fetch balance information (pass shared signal so it cancels together)
        const balanceVerusID = flattened.name || searchInput;
        await fetchBalance(balanceVerusID, controller.signal);

        // Resolve authority addresses to names in the background; prefer fields from the API
        void (async () => {
          try {
            const toResolve: Array<{
              key: 'revocation' | 'recovery' | 'parent';
              address?: string;
            }> = [
              {
                key: 'revocation',
                address:
                  apiIdentity.identity?.revocationauthority ||
                  apiIdentity.revocationauthority,
              },
              {
                key: 'recovery',
                address:
                  apiIdentity.identity?.recoveryauthority ||
                  apiIdentity.recoveryauthority,
              },
              {
                key: 'parent',
                address: apiIdentity.parent || apiIdentity.identity?.parent,
              },
            ];

            const results = await Promise.all(
              toResolve.map(async item => {
                if (!item.address) return { key: item.key, name: undefined };
                try {
                  const res = await apiFetch(
                    `/api/verus-identity/${item.address}`,
                    { signal: controller.signal }
                  );
                  if (!res) return { key: item.key, name: undefined };
                  const friendly = res?.data?.identity?.friendlyname;
                  const fqn = res?.data?.identity?.fullyqualifiedname;
                  const internal = res?.data?.identity?.identity?.name;
                  const name = friendly || fqn || internal;
                  return { key: item.key, name };
                } catch (err: any) {
                  if ((err as any)?.name === 'AbortError') {
                    return { key: item.key, name: undefined };
                  }
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
      if ((err as any)?.name === 'AbortError') {
        // User cancelled the lookup — do not surface an error
        return;
      }
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
    return formatCryptoValue(amount, 'VRSC');
  };

  const formatVRSCShort = (amount: number) => {
    // Balance API now returns VRSC values directly, no conversion needed
    return formatFriendlyNumber(amount, { precision: 2 });
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
        return 'text-green-400';
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
        return <LockOpen className="h-4 w-4" />;
      case 'revoked':
        return <Lock className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const toggleSection = (section: string) => {
    console.log(
      `[VerusID Debug] toggleSection called for section: "${section}"`
    );
    console.log(
      `[VerusID Debug] Current expanded sections:`,
      Array.from(expandedSections)
    );
    console.log(
      `[VerusID Debug] Current stakingLoading state:`,
      stakingLoading
    );

    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
      // Clear staking loading when collapsing
      if (section === 'staking') {
        setStakingLoading(false);
      }
    } else {
      newExpanded.add(section);
      // Set staking loading when expanding staking section
      if (section === 'staking') {
        setStakingLoading(true);
        // Clear loading after a realistic delay to show the loading state
        setTimeout(() => {
          setStakingLoading(false);
        }, 800);
      }
    }
    setExpandedSections(newExpanded);
  };

  const isSectionExpanded = (section: string) => expandedSections.has(section);

  const handleTabChange = (tabId: string) => {
    setDetailsTab(tabId as any);
    setLoadedTabs(prev => new Set([...Array.from(prev), tabId]));
  };

  return (
    <div className="space-y-6 text-white px-4 xl:px-8 py-8">
      <div className="max-w-[1800px] mx-auto">
        {/* Debug Panel - Only show in development */}
        {process.env.NODE_ENV === 'development' && false && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-xs">
            <h4 className="text-gray-300 font-semibold mb-2">🔧 Debug Info</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 text-gray-400">
              <div>
                <strong>loading:</strong> {String(loading)}
              </div>
              <div>
                <strong>balanceLoading:</strong> {String(balanceLoading)}
              </div>
              <div>
                <strong>stakingLoading:</strong> {String(stakingLoading)}
              </div>
              <div>
                <strong>error:</strong> {error || 'none'}
              </div>
              <div>
                <strong>verusID:</strong> {verusID?.name || 'none'}
              </div>
              <div>
                <strong>identityaddress:</strong>{' '}
                {verusID?.identityaddress ? 'present' : 'none'}
              </div>
              <div>
                <strong>expandedSections:</strong>{' '}
                {Array.from(expandedSections).join(', ') || 'none'}
              </div>
              <div>
                <strong>activeTab:</strong> {activeTab}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Header with Tabs */}
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-700">
          <div className="flex items-center justify-between mb-8">
            <div>
              {/* Breadcrumb added for accessibility and tests */}
              <nav
                aria-label="Breadcrumb"
                className="mb-2 text-sm text-blue-200"
              >
                <span className="mr-2">VerusPulse</span>
                <span className="text-gray-400">/</span>
                <span className="ml-2">VerusIDs</span>
              </nav>
              <h2 className="text-3xl font-bold flex items-center">
                <UsersThree className="h-8 w-8 mr-3 text-verus-blue" />
                VerusID Explorer
              </h2>
              <p className="text-blue-200 text-sm mt-1">
                Explore VerusID identities and their associated addresses
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-2">
                <button
                  onClick={() => setActiveTab('search')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                    activeTab === 'search'
                      ? 'bg-blue-500 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <MagnifyingGlass className="h-4 w-4" />
                  <span>MagnifyingGlass</span>
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
                  <TrendUp className="h-4 w-4" />
                  <span>Trending</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* VerusID Sync Status */}
        <VerusIDSyncStatus currentVerusID={verusID?.identityaddress} />

        {/* MagnifyingGlass Interface */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={identity}
                  onChange={e => setIdentity(e.target.value)}
                  placeholder="Enter VerusID (e.g., @username)"
                  className="w-full px-4 py-3 bg-white/10 border border-slate-700 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={e => {
                    if (e.key === 'Enter') {
                      const val = (e.currentTarget as HTMLInputElement).value;
                      void searchIdentity(val);
                    }
                  }}
                />
              </div>
              <button
                onClick={() => void searchIdentity()}
                disabled={loading || !identity.trim()}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MagnifyingGlass className="h-4 w-4" />
                <span>{loading ? 'Searching...' : 'MagnifyingGlass'}</span>
              </button>
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-blue-200 mb-2 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Recent Searches:
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setIdentity(search);
                        setTimeout(() => void searchIdentity(search), 100);
                      }}
                      className="px-3 py-1 bg-white/10 hover:bg-blue-500/30 border border-slate-700 hover:border-blue-500/50 rounded-lg text-sm text-blue-100 hover:text-white transition-all"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trending Identities */}
        {activeTab === 'trending' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Trending VerusIDs</h3>
              <div className="flex items-center space-x-2">
                <Funnel className="h-4 w-4 text-blue-300" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-white/10 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                >
                  <option value="balance">Balance</option>
                  <option value="activity">Activity</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {trendingIdentities.map((identity, index) => (
                <div
                  key={index}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => {
                    setIdentity(identity.name);
                    searchIdentity();
                    setActiveTab('search');
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-verus-blue" />
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
                    <ArrowSquareOut className="h-4 w-4 text-blue-300" />
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

      {/* Empty State - Show when no search has been performed */}
      {!verusID && !loading && !error && (
        <div className="bg-gradient-to-br from-verus-blue/10 to-verus-green/10 backdrop-blur-sm rounded-2xl p-12 border border-verus-blue/20">
          <div className="text-center">
            <div className="mb-6">
              <UsersThree className="h-24 w-24 text-purple-300 mx-auto mb-4 opacity-70" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Discover VerusID Identities
            </h3>
            <p className="text-blue-200 mb-8 text-lg">
              Enter a VerusID in the search box above to explore identity
              details, view balances, analyze staking rewards, and track
              performance over time.
            </p>

            {/* Example Searches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white/10 rounded-lg p-4 text-left">
                <div className="flex items-center space-x-2 mb-2">
                  <MagnifyingGlass className="h-4 w-4 text-blue-300" />
                  <p className="text-sm font-medium text-blue-200">
                    Try searching with @:
                  </p>
                </div>
                <code className="text-white font-mono text-sm bg-black/30 px-3 py-1 rounded">
                  @username
                </code>
              </div>
              <div className="bg-white/10 rounded-lg p-4 text-left">
                <div className="flex items-center space-x-2 mb-2">
                  <MagnifyingGlass className="h-4 w-4 text-blue-300" />
                  <p className="text-sm font-medium text-blue-200">
                    Or with full name:
                  </p>
                </div>
                <code className="text-white font-mono text-sm bg-black/30 px-3 py-1 rounded">
                  username.VRSC@
                </code>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <Wallet className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-white mb-1">
                  Balance & Holdings
                </h4>
                <p className="text-xs text-blue-200">
                  View VRSC balances across all addresses
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <ChartBar className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-white mb-1">
                  Staking Analytics
                </h4>
                <p className="text-xs text-blue-200">
                  Track monthly rewards with interactive charts
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <Shield className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-white mb-1">
                  Identity Details
                </h4>
                <p className="text-xs text-blue-200">
                  Explore authorities, addresses & properties
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {verusID && (
        <div className="space-y-6">
          {/* Identity Header Card */}
          <div className="bg-gradient-to-r from-verus-blue/20 to-verus-green/20 backdrop-blur-sm rounded-2xl p-6 border border-verus-blue/30">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-verus-blue/20">
                  <UsersThree className="h-8 w-8 text-purple-300" />
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
              <div className="flex flex-col items-end space-y-2">
                {lastUpdated && (
                  <div className="text-xs text-blue-200 flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
                  </div>
                )}
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
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
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
                  {verusID.txid ? (
                    <a
                      className="underline decoration-blue-400/60 hover:decoration-blue-400"
                      href={`/tx/${verusID.txid}`}
                      title="Open transaction"
                    >
                      {verusID.txid.slice(0, 20)}...
                    </a>
                  ) : (
                    <span className="text-gray-400">Not available</span>
                  )}
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

          {/* Horizontal Tabs */}
          <div className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden">
            <Tabs
              tabs={[
                {
                  id: 'overview',
                  label: 'Overview',
                  icon: <Eye className="h-4 w-4" />,
                },
                {
                  id: 'staking',
                  label: 'Staking Dashboard',
                  icon: <ChartBar className="h-4 w-4" />,
                },
                {
                  id: 'utxo',
                  label: 'UTXO Analytics',
                  icon: <Database className="h-4 w-4" />,
                },
                {
                  id: 'achievements',
                  label: 'Achievements',
                  icon: <Medal className="h-4 w-4" />,
                },
                {
                  id: 'identity',
                  label: 'Identity Details',
                  icon: <Shield className="h-4 w-4" />,
                },
              ]}
              activeTab={detailsTab}
              onTabChange={handleTabChange}
            />

            {/* Tab Content */}
            <div className="p-6">
              {/* Overview Tab */}
              <TabPanel id="overview" activeTab={detailsTab}>
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
                  {/* Main Content */}
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-verus-blue/10 to-verus-green/10 rounded-xl p-6 border border-blue-500/20">
                      <h4 className="text-xl font-bold text-white mb-4">
                        Welcome to {verusID.name}
                      </h4>
                      <p className="text-blue-200 mb-4">
                        Explore comprehensive staking analytics, UTXO health
                        metrics, and achievement progress.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setDetailsTab('staking')}
                          className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg p-4 text-left transition-colors"
                        >
                          <ChartBar className="h-6 w-6 text-blue-400 mb-2" />
                          <div className="text-white font-medium">
                            Staking Dashboard
                          </div>
                          <div className="text-xs text-blue-200 mt-1">
                            View your staking performance
                          </div>
                        </button>
                        <button
                          onClick={() => setDetailsTab('utxo')}
                          className="bg-verus-blue/20 hover:bg-verus-blue/20 border border-verus-blue/30 rounded-lg p-4 text-left transition-colors"
                        >
                          <Database className="h-6 w-6 text-verus-blue mb-2" />
                          <div className="text-white font-medium">
                            UTXO Analytics
                          </div>
                          <div className="text-xs text-purple-200 mt-1">
                            Analyze your UTXOs
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-4">
                    {/* Balance Section - Compact */}
                    {balance && (
                      <div className="bg-slate-900 rounded-2xl border border-slate-700 p-4">
                        <div className="flex items-center space-x-3 mb-4">
                          <Wallet className="h-5 w-5 text-green-400" />
                          <h4 className="text-lg font-semibold text-white">
                            VRSC Balance
                          </h4>
                          {balanceLoading && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                            <div className="text-2xl font-bold text-green-400">
                              {formatVRSC(balance.totalBalance)}
                            </div>
                            <div className="text-xs text-blue-200">
                              Current Balance
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-center p-2 bg-slate-800 border border-slate-700 rounded">
                              <div className="text-blue-300 font-semibold">
                                {formatVRSCShort(balance.totalReceived)}
                              </div>
                              <div className="text-xs text-blue-200">
                                Received
                              </div>
                            </div>
                            <div className="text-center p-2 bg-slate-800 border border-slate-700 rounded">
                              <div className="text-red-300 font-semibold">
                                {formatVRSCShort(balance.totalSent)}
                              </div>
                              <div className="text-xs text-blue-200">Sent</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Authorities Section - Compact */}
                    <div className="bg-slate-900 rounded-2xl border border-slate-700 p-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <Shield className="h-5 w-5 text-green-400" />
                        <h4 className="text-lg font-semibold text-white">
                          Authorities
                        </h4>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-blue-200 mb-1">
                            Revocation Authority
                          </div>
                          <div className="text-white text-sm">
                            {resolvedAuthorities.revocation ? (
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {resolvedAuthorities.revocation}
                                </div>
                                {verusID.revocationauthority && (
                                  <div className="font-mono text-blue-200/80 text-xs">
                                    {verusID.revocationauthority.slice(0, 16)}
                                    ...
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="font-mono text-gray-400">
                                {verusID.revocationauthority
                                  ? verusID.revocationauthority.slice(0, 16) +
                                    '...'
                                  : 'None'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-blue-200 mb-1">
                            Recovery Authority
                          </div>
                          <div className="text-white text-sm">
                            {resolvedAuthorities.recovery ? (
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {resolvedAuthorities.recovery}
                                </div>
                                {verusID.recoveryauthority && (
                                  <div className="font-mono text-blue-200/80 text-xs">
                                    {verusID.recoveryauthority.slice(0, 16)}...
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="font-mono text-gray-400">
                                {verusID.recoveryauthority
                                  ? verusID.recoveryauthority.slice(0, 16) +
                                    '...'
                                  : 'None'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-blue-200 mb-1">
                            Parent
                          </div>
                          <div className="text-white text-sm">
                            {resolvedAuthorities.parent ? (
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {resolvedAuthorities.parent}
                                </div>
                                {verusID.parent && (
                                  <div className="font-mono text-blue-200/80 text-xs">
                                    {verusID.parent.slice(0, 16)}...
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="font-mono text-gray-400">
                                {verusID.parent
                                  ? verusID.parent.slice(0, 16) + '...'
                                  : 'Root'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setDetailsTab('identity')}
                        className="mt-3 text-xs text-blue-300 hover:text-blue-200 w-full text-center"
                      >
                        View full details →
                      </button>
                    </div>

                    {/* Properties Section - Compact */}
                    <div className="bg-slate-900 rounded-2xl border border-slate-700 p-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <Key className="h-5 w-5 text-blue-400" />
                        <h4 className="text-lg font-semibold text-white">
                          Properties
                        </h4>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-200 text-sm">
                            Can Revoke:
                          </span>
                          <span className="text-white">
                            {verusID.canrevoke ? (
                              <span className="flex items-center space-x-1 text-green-400">
                                <Check className="h-3 w-3" />
                                <span className="text-sm">Yes</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-1 text-red-400">
                                <WarningCircle className="h-3 w-3" />
                                <span className="text-sm">No</span>
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-200 text-sm">
                            Time Lock:
                          </span>
                          <span className="text-white text-sm">
                            {verusID.timelock}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-200 text-sm">
                            Version:
                          </span>
                          <span className="text-white text-sm">
                            {verusID.version}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setDetailsTab('identity')}
                        className="mt-3 text-xs text-blue-300 hover:text-blue-200 w-full text-center"
                      >
                        View all properties →
                      </button>
                    </div>
                  </div>
                </div>
              </TabPanel>

              {/* Staking Dashboard Tab */}
              {loadedTabs.has('staking') && (
                <TabPanel id="staking" activeTab={detailsTab}>
                  {verusID.identityaddress && (
                    <VerusIDStakingDashboard
                      iaddr={verusID.identityaddress}
                      verusID={verusID.name}
                    />
                  )}
                </TabPanel>
              )}

              {/* UTXO Analytics Tab */}
              {loadedTabs.has('utxo') && (
                <TabPanel id="utxo" activeTab={detailsTab}>
                  {verusID.identityaddress && (
                    <VerusIDUTXOAnalytics iaddr={verusID.identityaddress} />
                  )}
                </TabPanel>
              )}

              {/* Achievements Tab */}
              {loadedTabs.has('achievements') && (
                <TabPanel id="achievements" activeTab={detailsTab}>
                  {verusID.identityaddress && (
                    <VerusIDAchievements iaddr={verusID.identityaddress} />
                  )}
                </TabPanel>
              )}

              {/* Identity Details Tab */}
              {loadedTabs.has('identity') && (
                <TabPanel id="identity" activeTab={detailsTab}>
                  <VerusIDIdentityDetails
                    verusID={verusID}
                    balance={balance}
                    resolvedAuthorities={resolvedAuthorities}
                  />
                </TabPanel>
              )}
            </div>
          </div>

          {/* Collapsible Sections - Legacy (Hidden for now) */}
          <div className="space-y-4 hidden">
            {/* Balance Section */}
            {balance && (
              <div className="bg-slate-900 rounded-2xl border border-slate-700">
                <button
                  onClick={() => toggleSection('balance')}
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-800 border border-slate-700 transition-colors"
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
                    <CaretDown className="h-5 w-5 text-blue-300" />
                  ) : (
                    <CaretRight className="h-5 w-5 text-blue-300" />
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

                      {/* Explanation of balance data */}
                      <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <div className="text-xs text-blue-200">
                          <strong>Note:</strong> &quot;Total Received&quot;
                          shows all funds ever received by this address.
                          &quot;Total Sent&quot; is calculated as (Received -
                          Current Balance). This is normal for addresses with
                          transaction history.
                        </div>
                      </div>

                      {balance.addressDetails &&
                        balance.addressDetails.length > 0 && (
                          <div>
                            <div className="mb-4">
                              <div className="text-sm text-blue-200 mb-2 font-medium">
                                Address Hierarchy:
                              </div>
                              <div className="text-xs text-gray-400 mb-3">
                                I-Address (Identity) • Primary Addresses
                                (Associated)
                              </div>
                              {/* 
                              Verus Address Hierarchy:
                              1. I-Address: The VerusID's own identity address (iCDYc7VjE...)
                              2. Primary Addresses: Associated addresses linked to the VerusID (RFd31DGN7...)
                              
                              For GitHub documentation, use:
                              - "I-Address" for identity addresses
                              - "Primary Address" for associated addresses
                            */}
                            </div>
                            <div className="space-y-3">
                              {balance.addressDetails.map((addr, index) => (
                                <div
                                  key={index}
                                  className={`flex justify-between items-center rounded-lg p-4 ${
                                    addr.isIdentityAddress
                                      ? 'bg-green-500/20 border border-green-400/30 ring-1 ring-green-400/20'
                                      : 'bg-slate-800 border border-slate-700 border border-white/10'
                                  }`}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                      <div className="text-white font-mono text-sm break-all">
                                        {addr.address}
                                      </div>
                                      {addr.isIdentityAddress ? (
                                        <span className="px-2 py-1 bg-green-500/30 text-green-300 text-xs rounded-full">
                                          I-Address
                                        </span>
                                      ) : (
                                        <span className="px-2 py-1 bg-blue-500/30 text-blue-300 text-xs rounded-full">
                                          Primary Address
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
            <div className="bg-slate-900 rounded-2xl border border-slate-700">
              <button
                onClick={() => toggleSection('properties')}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-800 border border-slate-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Key className="h-6 w-6 text-blue-400" />
                  <h4 className="text-xl font-semibold text-white">
                    Identity Properties
                  </h4>
                </div>
                {isSectionExpanded('properties') ? (
                  <CaretDown className="h-5 w-5 text-blue-300" />
                ) : (
                  <CaretRight className="h-5 w-5 text-blue-300" />
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
                              <WarningCircle className="h-4 w-4" />
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
            <div className="bg-slate-900 rounded-2xl border border-slate-700">
              <button
                onClick={() => toggleSection('authorities')}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-800 border border-slate-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="h-6 w-6 text-green-400" />
                  <h4 className="text-xl font-semibold text-white">
                    Authorities
                  </h4>
                </div>
                {isSectionExpanded('authorities') ? (
                  <CaretDown className="h-5 w-5 text-blue-300" />
                ) : (
                  <CaretRight className="h-5 w-5 text-blue-300" />
                )}
              </button>
              {isSectionExpanded('authorities') && (
                <div className="px-6 pb-6 border-t border-white/10">
                  <div className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
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
                      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
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
                      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
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

            {/* Comprehensive Staking Statistics Dashboard */}
            {verusID.identityaddress && (
              <VerusIDStakingDashboard
                iaddr={verusID.identityaddress}
                verusID={verusID.name}
              />
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <WarningCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <div className="text-red-400 font-semibold text-lg">
                {error.toLowerCase().includes('not found')
                  ? 'Identity Not Found'
                  : 'Error'}
              </div>
              <div className="text-red-300 text-sm mt-1">{error}</div>

              {/* Helpful suggestions for "not found" errors */}
              {error.toLowerCase().includes('not found') && (
                <div className="mt-4 bg-red-500/10 rounded-lg p-4">
                  <p className="text-red-200 text-sm font-medium mb-2">
                    💡 Suggestions:
                  </p>
                  <ul className="text-red-200 text-sm space-y-1 list-disc list-inside">
                    <li>Check the spelling of the VerusID</li>
                    <li>
                      Try with or without the @ symbol (e.g.,
                      &quot;username@&quot; or &quot;@username&quot;)
                    </li>
                    <li>Ensure the identity is registered on the main chain</li>
                    <li>
                      Use the full qualified name (e.g.,
                      &quot;username.VRSC@&quot;)
                    </li>
                  </ul>
                </div>
              )}

              {/* Retry button */}
              <button
                onClick={() => {
                  setError(null);
                  if (identity.trim()) {
                    searchIdentity();
                  }
                }}
                className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
