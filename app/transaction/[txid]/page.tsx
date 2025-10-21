'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Hash,
  Cube,
  Clock,
  Coins,
  ArrowsLeftRight,
  Copy,
  Check,
  Warning,
  ArrowRight,
} from '@phosphor-icons/react';
import { BackButton } from '@/components/ui/back-button';
import { useNavigationHistory } from '@/lib/hooks/use-navigation-history';

interface ScriptPubKey {
  asm?: string;
  hex?: string;
  type?: string;
  addresses?: string[];
}

interface Vin {
  txid?: string;
  vout?: number;
  coinbase?: string;
  scriptSig?: {
    asm: string;
    hex: string;
  };
  sequence?: number;
}

interface Vout {
  value: number;
  n: number;
  scriptPubKey: ScriptPubKey;
}

interface TransactionData {
  txid: string;
  version: number;
  locktime: number;
  vin: Vin[];
  vout: Vout[];
  blockhash?: string;
  blocktime?: number;
  confirmations?: number;
  time?: number;
  size?: number;
  hex?: string;
  fee?: number;
}

interface TransactionApiResponse {
  success: boolean;
  data?: TransactionData;
  error?: string;
}

const TransactionDetailsPage = ({
  params,
}: {
  params: Promise<{ txid: string }>;
}) => {
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { initializeHistory } = useNavigationHistory();

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      setTxid(resolvedParams.txid);
    };
    unwrapParams();
  }, [params]);

  // Initialize navigation history if empty (for direct URL access)
  useEffect(() => {
    initializeHistory('/');
  }, [initializeHistory]);

  const fetchTransaction = useCallback(async () => {
    if (!txid) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/transaction/${txid}`);
      const result: TransactionApiResponse = await response.json();

      if (result.success && result.data) {
        setTransaction(result.data);
      } else {
        setError(result.error || 'Failed to fetch transaction details');
      }
    } catch (err) {
      setError('Network error while fetching transaction details');
    } finally {
      setLoading(false);
    }
  }, [txid]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAddress = (address: string, length: number = 16) => {
    if (address.length <= length * 2) return address;
    return `${address.substring(0, length)}...${address.substring(address.length - length)}`;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const calculateTotalInput = () => {
    // For coinbase transactions, there's no input value
    if (transaction?.vin[0]?.coinbase) return 0;
    // Input values would need to be fetched from previous transactions
    return 0;
  };

  const calculateTotalOutput = () => {
    if (!transaction) return 0;
    return transaction.vout.reduce((sum, vout) => sum + vout.value, 0);
  };

  const isCoinbase = transaction?.vin[0]?.coinbase !== undefined;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen theme-bg-primary">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <div className="bg-gray-900 border border-gray-600 rounded-xl w-full mx-auto max-w-4xl p-6 shadow-2xl">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-white/10 rounded w-1/4"></div>
              <div className="h-64 bg-white/5 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !transaction) {
    return (
      <div className="min-h-screen theme-bg-primary">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <div className="bg-gray-900 border border-gray-600 rounded-xl w-full mx-auto max-w-4xl p-6 shadow-2xl">
            <div className="text-center py-12">
              <Warning className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Transaction Not Found
              </h2>
              <p className="text-gray-400 mb-6">
                {error || 'Unable to load transaction details'}
              </p>
              <div className="flex gap-4 justify-center">
                <BackButton />
                <button
                  onClick={fetchTransaction}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg-primary">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 theme-text-primary">
        <div className="bg-gray-900 border border-gray-600 rounded-xl w-full mx-auto max-w-4xl p-6 shadow-2xl">
          {/* Header with Back Button */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
            <div className="flex items-center space-x-4">
              <BackButton size="md" variant="ghost" />
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
                  <Hash className="h-6 w-6 text-blue-400" />
                  <span>Transaction Details</span>
                </h1>
                {isCoinbase && (
                  <span className="inline-block mt-2 px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-semibold">
                    Coinbase Transaction
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-4">
            {/* Transaction ID */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-blue-200 font-semibold mb-2 text-sm">
                Transaction ID
              </div>
              <div className="flex items-center space-x-2">
                <code className="text-white font-mono text-sm break-all flex-1">
                  {transaction.txid}
                </code>
                <button
                  onClick={() => copyToClipboard(transaction.txid, 'txid')}
                  className="p-2 hover:bg-white/20 rounded transition-colors flex-shrink-0"
                  title="Copy transaction ID"
                >
                  {copied === 'txid' ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Block Information */}
            {transaction.blockhash && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-blue-200 font-semibold mb-2 text-sm">
                  Block Hash
                </div>
                <Link
                  href={`/block/${transaction.blockhash}`}
                  className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Cube className="h-4 w-4" />
                  <code className="font-mono text-sm">
                    {formatAddress(transaction.blockhash, 16)}
                  </code>
                </Link>
              </div>
            )}

            {/* Confirmations */}
            {transaction.confirmations !== undefined && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-blue-200 font-semibold mb-2 text-sm">
                  Confirmations
                </div>
                <div className="text-white font-semibold">
                  {transaction.confirmations.toLocaleString()}
                </div>
              </div>
            )}

            {/* Timestamp */}
            {(transaction.time || transaction.blocktime) && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-blue-200 font-semibold mb-2 text-sm flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Timestamp</span>
                </div>
                <div className="text-white">
                  {formatTime(transaction.time || transaction.blocktime || 0)}
                </div>
              </div>
            )}

            {/* Transaction Summary */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-blue-200 font-semibold mb-2 text-sm">
                    Size
                  </div>
                  <div className="text-white">
                    {transaction.size ? `${transaction.size} bytes` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 font-semibold mb-2 text-sm">
                    Version
                  </div>
                  <div className="text-white">{transaction.version}</div>
                </div>
                <div>
                  <div className="text-blue-200 font-semibold mb-2 text-sm">
                    Lock Time
                  </div>
                  <div className="text-white">{transaction.locktime}</div>
                </div>
              </div>
            </div>

            {/* Fee Information */}
            {transaction.fee !== undefined && transaction.fee > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-blue-200 font-semibold mb-2 text-sm flex items-center space-x-2">
                  <Coins className="h-4 w-4" />
                  <span>Transaction Fee</span>
                </div>
                <div className="text-white font-semibold">
                  {transaction.fee.toFixed(8)} VRSC
                </div>
              </div>
            )}

            {/* Inputs and Outputs */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-4">
                <ArrowsLeftRight className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">
                  Inputs & Outputs
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inputs */}
                <div>
                  <div className="text-blue-200 mb-3 font-semibold flex items-center justify-between">
                    <span>Inputs ({transaction.vin.length})</span>
                    {!isCoinbase && calculateTotalInput() > 0 && (
                      <span className="text-green-400 text-sm">
                        {calculateTotalInput().toFixed(8)} VRSC
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {transaction.vin.map((vin, index) => (
                      <div
                        key={index}
                        className="bg-gray-700/30 p-3 rounded-md text-sm"
                      >
                        {vin.coinbase ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-green-400 font-semibold">
                              Coinbase
                            </span>
                            <code className="text-gray-400 text-xs">
                              {vin.coinbase.substring(0, 24)}...
                            </code>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-400">TX:</span>
                              {vin.txid ? (
                                <Link
                                  href={`/transaction/${vin.txid}`}
                                  className="text-blue-400 hover:text-blue-300 font-mono text-xs"
                                >
                                  {formatAddress(vin.txid, 12)}
                                </Link>
                              ) : (
                                <span className="text-gray-500">Unknown</span>
                              )}
                            </div>
                            <div className="text-gray-400">
                              Output: {vin.vout}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="hidden lg:flex items-center justify-center">
                  <ArrowRight className="h-8 w-8 text-blue-400" />
                </div>

                {/* Outputs */}
                <div>
                  <div className="text-blue-200 mb-3 font-semibold flex items-center justify-between">
                    <span>Outputs ({transaction.vout.length})</span>
                    <span className="text-green-400 text-sm">
                      {calculateTotalOutput().toFixed(8)} VRSC
                    </span>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {transaction.vout.map((vout, index) => (
                      <div
                        key={index}
                        className="bg-gray-700/30 p-3 rounded-md text-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400">#{vout.n}</span>
                          <span className="text-green-400 font-semibold">
                            {vout.value.toFixed(8)} VRSC
                          </span>
                        </div>
                        {vout.scriptPubKey.addresses &&
                          vout.scriptPubKey.addresses.length > 0 && (
                            <div className="space-y-1">
                              {vout.scriptPubKey.addresses.map(
                                (address, addrIndex) => (
                                  <code
                                    key={addrIndex}
                                    className="text-white font-mono text-xs block"
                                  >
                                    {formatAddress(address, 12)}
                                  </code>
                                )
                              )}
                            </div>
                          )}
                        {vout.scriptPubKey.type && (
                          <div className="text-gray-500 text-xs mt-1">
                            Type: {vout.scriptPubKey.type}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Back Button at Bottom */}
            <div className="pt-4 border-t border-gray-700">
              <BackButton size="md" variant="outline" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailsPage;
