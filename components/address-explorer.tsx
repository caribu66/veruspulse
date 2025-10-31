'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  User,
  Coins,
  TrendUp,
  TrendDown,
  Clock,
  Hash,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  MagnifyingGlass,
  WarningCircle,
  Info,
  ChartBar,
  ChartPie,
  Medal,
} from '@phosphor-icons/react';
import {
  formatFriendlyNumber,
  formatCryptoValue,
  formatFileSize,
  formatTransactionCount,
} from '@/lib/utils/number-formatting';
// import { StakeRewardsDashboard } from './stake-rewards-dashboard'; // Removed
// import { StakeWeightCard } from './stake-weight-card'; // Removed
// import { StakeAgeDashboard } from './stake-age-dashboard'; // Removed

interface AddressBalance {
  balance: number;
  received: number;
  sent: number;
  txcount: number;
}

interface AddressTransaction {
  txid: string;
  time: number;
  value: number;
  type: 'sent' | 'received' | 'stake_reward';
  confirmations: number;
  stakeRewardInfo?: {
    isStakeReward: boolean;
    stakeAmount?: number;
    rewardAmount?: number;
    stakedInputs?: number;
    rewardOutputs?: number;
    stakeAge?: number;
    blockHeight?: number;
    blockType?: 'pos' | 'pow';
  };
  transactionType?: 'coinbase' | 'stake_reward' | 'transfer' | 'burn';
  blockHeight?: number;
  blockType?: 'pos' | 'pow';
}

interface AddressUTXO {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey: {
    addresses: string[];
    type: string;
  };
  confirmations: number;
}

export function AddressExplorer() {
  const tCommon = useTranslations('common');
  const t = useTranslations('dashboard');
  const tBlocks = useTranslations('blocks');
  const tVerusId = useTranslations('verusid');
  const tStaking = useTranslations('staking');

  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState<AddressBalance | null>(null);
  const [transactions, setTransactions] = useState<AddressTransaction[]>([]);
  const [utxos, setUtxos] = useState<AddressUTXO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'transactions' | 'utxos'
  >('overview');
  const [verusID, setVerusID] = useState<any>(null);
  const [primaryAddress, setPrimaryAddress] = useState<string>('');

  const searchAddress = async () => {
    if (!address.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setVerusID(null);
      setPrimaryAddress('');

      const trimmedAddress = address.trim();
      let targetAddress = trimmedAddress;

      // Check if input is a VerusID (contains @)
      if (trimmedAddress.includes('@')) {
        try {
          const verusIDResponse = await fetch('/api/verusid-lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: trimmedAddress }),
          });

          const verusIDData = await verusIDResponse.json();

          if (verusIDData.success && verusIDData.data?.identity) {
            setVerusID(verusIDData.data.identity);

            // Get the identity address from the VerusID (for staking rewards)
            // Use identity address for staking, primary address for general balance
            const identity = verusIDData.data.identity;
            if (identity.identityaddress) {
              targetAddress = identity.identityaddress; // Use I-address for staking rewards
              setPrimaryAddress(targetAddress);
            } else if (
              identity.primaryaddresses &&
              identity.primaryaddresses.length > 0
            ) {
              targetAddress = identity.primaryaddresses[0]; // Fallback to R-address
              setPrimaryAddress(targetAddress);
            } else {
              setError('VerusID found but no address available');
              return;
            }
          } else {
            // Check if it's the Identity APIs not activated error
            if (
              verusIDData.error &&
              verusIDData.error.includes('Identity APIs not activated')
            ) {
              setError(
                'VerusID lookup is not available - Identity APIs are not activated on this blockchain. Please enter a regular Verus address instead.'
              );
            } else {
              setError(verusIDData.error || 'VerusID not found');
            }
            return;
          }
        } catch (err) {
          setError('Failed to lookup VerusID');
          return;
        }
      }

      // Fetch address data using the target address
      const [balanceRes, txRes, utxoRes] = await Promise.allSettled([
        fetch(`/api/address/${targetAddress}`),
        fetch(`/api/address/${targetAddress}/transactions`),
        fetch(`/api/address/${targetAddress}/utxos`),
      ]);

      if (balanceRes.status === 'fulfilled') {
        const balanceData = await balanceRes.value.json();
        if (balanceData.success && balanceData.data) {
          setBalance(balanceData.data);
        } else if (!balanceData.success && balanceData.error) {
          setError(balanceData.error);
          return;
        }
      }

      if (txRes.status === 'fulfilled') {
        const txData = await txRes.value.json();
        if (txData.success && txData.data) {
          setTransactions(txData.data);
        }
      }

      if (utxoRes.status === 'fulfilled') {
        const utxoData = await utxoRes.value.json();
        if (utxoData.success && utxoData.data) {
          setUtxos(utxoData.data);
        }
      }
    } catch (err) {
      setError('Network error while fetching address data');
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
      // Silent error handling for clipboard
    }
  };

  // Using imported formatting functions from utils

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTransactionTypeColor = (type: string) => {
    return type === 'received' ? 'text-green-400' : 'text-red-400';
  };

  const getTransactionTypeIcon = (type: string) => {
    return type === 'received' ? ArrowRight : ArrowLeft;
  };

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Address Explorer</h2>
          <p className="text-blue-200 text-sm mt-1">
            Analyze Verus addresses, balances, and transaction history. VerusID
            support depends on blockchain configuration.
          </p>
        </div>
      </div>

      {/* MagnifyingGlass */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Enter Verus address (R9vqQz8...) or VerusID (e.g., VerusPulse@)"
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={e => e.key === 'Enter' && searchAddress()}
            />
          </div>
          <button
            onClick={searchAddress}
            disabled={loading || !address.trim()}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MagnifyingGlass className="h-4 w-4" />
            <span>{loading ? 'Searching...' : 'MagnifyingGlass'}</span>
          </button>
        </div>
      </div>

      {/* Results */}
      {balance && (
        <div className="space-y-6">
          {/* Address Header */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {verusID ? 'VerusID & Address Details' : 'Address Details'}
              </h3>
              <div className="flex space-x-2">
                {verusID && (
                  <button
                    onClick={() => copyToClipboard(address, 'verusid')}
                    className="flex items-center space-x-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
                  >
                    {copied === 'verusid' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span className="text-sm">Copy VerusID</span>
                  </button>
                )}
                <button
                  onClick={() =>
                    copyToClipboard(primaryAddress || address, 'address')
                  }
                  className="flex items-center space-x-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
                >
                  {copied === 'address' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="text-sm">Copy Address</span>
                </button>
              </div>
            </div>

            {verusID && (
              <div className="mb-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="h-4 w-4 text-blue-400" />
                  <span className="text-blue-400 font-semibold">VerusID:</span>
                </div>
                <div className="text-white font-mono text-sm break-all">
                  {address}
                </div>
                <div className="mt-2 text-xs text-blue-200">
                  Status:{' '}
                  <span className="text-green-400">
                    {verusID.status || 'Active'}
                  </span>
                  {verusID.minimumsignatures && (
                    <span className="ml-4">
                      Min Signatures: {verusID.minimumsignatures}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Hash className="h-4 w-4 text-green-400" />
                <span className="text-green-400 font-semibold">
                  {verusID ? 'Primary Address:' : 'Address:'}
                </span>
              </div>
              <div className="text-white font-mono text-sm break-all">
                {primaryAddress || address}
              </div>
            </div>
          </div>

          {/* Balance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Coins className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <div className="text-white font-semibold">Balance</div>
                  <div className="text-blue-200 text-sm">
                    {formatCryptoValue(balance.balance)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <TrendUp className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-white font-semibold">Received</div>
                  <div className="text-blue-200 text-sm">
                    {formatCryptoValue(balance.received)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <TrendDown className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <div className="text-white font-semibold">Sent</div>
                  <div className="text-blue-200 text-sm">
                    {formatCryptoValue(balance.sent)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-verus-blue/20">
                  <Hash className="h-5 w-5 text-verus-blue" />
                </div>
                <div>
                  <div className="text-white font-semibold">{tBlocks("transactions")}</div>
                  <div className="text-slate-300 text-sm">
                    {balance.txcount}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-700">
            <div className="flex space-x-1 mb-6">
              {[
                { key: 'overview', label: t("overview"), icon: ChartBar },
                { key: 'transactions', label: tBlocks("transactions"), icon: Hash },
                { key: 'utxos', label: 'UTXOs', icon: ChartPie },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === tab.key
                        ? 'bg-verus-blue text-white border border-verus-blue-light'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="text-lg font-semibold text-white mb-3">
                      Transaction Summary
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-blue-200">
                          Total Transactions:
                        </span>
                        <span className="text-white">{balance.txcount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-200">Total Received:</span>
                        <span className="text-green-400">
                          {formatCryptoValue(balance.received)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-200">Total Sent:</span>
                        <span className="text-red-400">
                          {formatCryptoValue(balance.sent)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-200">Current Balance:</span>
                        <span className="text-white font-semibold">
                          {formatCryptoValue(balance.balance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="text-lg font-semibold text-white mb-3">
                      UTXO Summary
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-blue-200">Total UTXOs:</span>
                        <span className="text-white">
                          {Array.isArray(utxos) ? utxos.length : 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-200">Total Value:</span>
                        <span className="text-white">
                          {formatCryptoValue(
                            Array.isArray(utxos)
                              ? utxos.reduce((sum, utxo) => sum + utxo.value, 0)
                              : 0
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-200">Average UTXO:</span>
                        <span className="text-white">
                          {Array.isArray(utxos) && utxos.length > 0
                            ? formatCryptoValue(
                                utxos.reduce(
                                  (sum, utxo) => sum + utxo.value,
                                  0
                                ) / utxos.length
                              )
                            : '0 VRSC'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">
                  Recent Transactions
                </h4>
                {transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.slice(0, 10).map((tx, index) => {
                      const Icon = getTransactionTypeIcon(tx.type);
                      return (
                        <div
                          key={index}
                          className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <Icon
                                className={`h-4 w-4 ${getTransactionTypeColor(tx.type)}`}
                              />
                              <div className="text-white font-mono text-sm">
                                {tx.txid.substring(0, 16)}...
                              </div>
                            </div>
                            <div
                              className={`font-semibold ${getTransactionTypeColor(tx.type)}`}
                            >
                              {tx.type === 'received' ? '+' : '-'}
                              {formatCryptoValue(tx.value)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-blue-200">
                            <div>{formatTime(tx.time)}</div>
                            <div>{tx.confirmations} confirmations</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-blue-200">
                    No transactions found
                  </div>
                )}
              </div>
            )}

            {/* UTXOs Tab */}
            {activeTab === 'utxos' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">
                  Unspent Transaction Outputs
                </h4>
                {utxos.length > 0 ? (
                  <div className="space-y-3">
                    {utxos.slice(0, 10).map((utxo, index) => (
                      <div
                        key={index}
                        className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-white font-mono text-sm">
                            {utxo.txid.substring(0, 16)}...:{utxo.vout}
                          </div>
                          <div className="text-green-400 font-semibold">
                            {formatCryptoValue(utxo.value)}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-blue-200">
                          <div>Type: {utxo.scriptPubKey.type}</div>
                          <div>{utxo.confirmations} confirmations</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-blue-200">
                    No UTXOs found
                  </div>
                )}
              </div>
            )}

            {/* Stake Rewards Tab - Removed */}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <WarningCircle className="h-5 w-5 text-red-400" />
            <div>
              <div className="text-red-400 font-semibold">{tCommon("error")}</div>
              <div className="text-red-300 text-sm">{error}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
