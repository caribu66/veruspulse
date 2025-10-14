'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  Hammer,
  Beef,
  X,
  ChevronDown,
  Gift,
  Loader,
  ArrowRight,
  ArrowLeft,
  Database,
  Hash,
  Info,
  Coins,
  Activity,
  AlertCircle,
  ExternalLink,
  Eye,
  Clock,
} from 'lucide-react';

interface ValuePool {
  id: string;
  monitored: boolean;
  chainValue: number;
  chainValueZat: number;
  valueDelta: number;
  valueDeltaZat: number;
}

interface Vin {
  coinbase?: string;
  txid?: string;
  vout?: number;
  scriptSig?: {
    asm: string;
    hex: string;
  };
  sequence: number;
}

interface ScriptPubKey {
  asm: string;
  hex: string;
  reqSigs: number;
  type: string;
  addresses: string[];
}

interface Vout {
  value: number;
  n: number;
  scriptPubKey: ScriptPubKey;
}

interface Transaction {
  txid: string;
  version: number;
  locktime: number;
  vin: Vin[];
  vout: Vout[];
}
interface Block {
  hash: string;
  height: number;
  time: number;
  size: number;
  difficulty: number;
  nTx: number;
  modifier: string;
  weight: number;
  version: number;
  nonce: number | string;
  bits: string;
  chainwork: string;
  previousblockhash?: string;
  nextblockhash?: string;
  merkleroot: string;
  tx: Transaction[];
  confirmations?: number;
  solution?: string;
  valuePools?: ValuePool[];
  anchor?: string;
  blocktype?: string;
  postarget?: string;
  chainstake?: string;
  reward?: number;
  rewardType?: string;
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
  hasStakeReward?: boolean;
  stakeAmount?: number;
  stakeRewardAmount?: number;
  stakeAge?: number;
}

export function LiveNetwork() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [fullBlockData, setFullBlockData] = useState<Block | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Modal best practices: focus management and accessibility
  useEffect(() => {
    if (selectedBlock) {
      // Lock body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Focus the close button for keyboard navigation
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);

      // Fetch full block data
      fetchFullBlockData(selectedBlock.hash);
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedBlock]);

  // Keyboard navigation for modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedBlock) return;

      if (event.key === 'Escape') {
        setSelectedBlock(null);
      } else if (event.key === 'Tab') {
        // Trap focus within modal
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlock]);

  const fetchFullBlockData = async (hash: string) => {
    setModalLoading(true);
    try {
      const response = await fetch(`/api/block/${hash}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setFullBlockData(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching full block data:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      setSelectedBlock(null);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const fetchLatestBlocks = async () => {
    try {
      const response = await fetch('/api/latest-blocks?limit=6');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();

      if (result.success && result.data) {
        setBlocks(result.data.blocks || []);
      } else {
        setError(result.error || 'Failed to fetch blocks');
      }
    } catch (err) {
      setError('Network error while fetching blocks');
      console.error('Error fetching blocks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestBlocks();
    const interval = setInterval(fetchLatestBlocks, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const TransactionDetail = ({
    tx,
    index,
  }: {
    tx: Transaction;
    index: number;
  }) => {
    const totalOutput = tx.vout?.reduce((sum, out) => sum + out.value, 0) || 0;

    return (
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-blue-200 font-semibold text-sm">
                #{index + 1}
              </span>
              <span className="text-gray-400 text-xs">TXID:</span>
            </div>
            <div className="font-mono text-white text-xs break-all overflow-wrap-anywhere">
              {tx.txid}
            </div>
          </div>
          <div className="text-white font-semibold text-sm whitespace-nowrap bg-green-500/20 px-2 py-1 rounded">
            {totalOutput.toFixed(8)} VRSC
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="text-blue-200 mb-2 text-sm font-medium">
              Inputs ({tx.vin?.length || 0})
            </div>
            <div className="bg-gray-700/30 p-3 rounded-md space-y-2 max-h-32 overflow-y-auto">
              {tx.vin?.map((vin, vinIndex) => (
                <div key={`vin-${vinIndex}`} className="text-xs">
                  {vin.coinbase ? (
                    <span className="text-green-400 font-semibold">
                      Coinbase
                    </span>
                  ) : (
                    <div className="font-mono text-white break-all">
                      {vin.txid?.substring(0, 20)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-blue-200 mb-2 text-sm font-medium">
              Outputs ({tx.vout?.length || 0})
            </div>
            <div className="bg-gray-700/30 p-3 rounded-md space-y-2 max-h-32 overflow-y-auto">
              {tx.vout?.map(vout => (
                <div
                  key={vout.n}
                  className="flex justify-between items-center text-xs"
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="text-white font-mono break-all">
                      {vout.scriptPubKey?.addresses?.[0] || 'Unknown Address'}
                    </div>
                  </div>
                  <div className="text-white font-semibold whitespace-nowrap">
                    {vout.value.toFixed(8)} VRSC
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DetailRow = ({
    label,
    value,
    isHash = false,
  }: {
    label: string;
    value: string | number;
    isHash?: boolean;
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-white/10 pb-3 pt-1">
      <div className="text-blue-200 font-medium min-w-0 md:col-span-1">
        {label}
      </div>
      <div
        className={`text-white md:col-span-3 min-w-0 ${
          isHash ? 'font-mono text-sm break-all overflow-wrap-anywhere' : ''
        }`}
      >
        {value === null || typeof value === 'undefined' ? 'N/A' : String(value)}
      </div>
    </div>
  );

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDifficulty = (difficulty: number) => {
    return (
      (difficulty / 1e6).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' M'
    );
  };

  const getBlockIcon = (modifier: string) => {
    if (modifier === 'stake') {
      return <Beef className="h-5 w-5 text-green-400" />;
    }
    return <Hammer className="h-5 w-5 text-yellow-400" />;
  };

  const ConfirmationStatus = ({ confirmations }: { confirmations: number }) => {
    const CONFIRMATION_THRESHOLD = 6;
    if (confirmations < CONFIRMATION_THRESHOLD) {
      const percentage = (confirmations / CONFIRMATION_THRESHOLD) * 100;
      return (
        <div className="flex items-center space-x-2">
          <div className="w-16 bg-gray-600 rounded-full h-1.5">
            <div
              className="bg-yellow-400 h-1.5 rounded-full"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <span className="text-xs text-yellow-400">
            Confirming ({confirmations}/{CONFIRMATION_THRESHOLD})
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center space-x-1 text-green-400">
        <Check className="h-3 w-3" />
        <span className="text-xs">Confirmed</span>
      </div>
    );
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Recent Blocks</h3>
          <p className="text-sm text-white/60 mt-1">
            Latest blockchain activity
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-white/60">Live</span>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <div className="text-center">
            <div className="text-blue-200 font-medium">
              Loading recent blocks
            </div>
            <div className="text-xs text-white/60">
              Fetching latest blockchain data...
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <div className="text-red-400 mb-2">Failed to load blocks</div>
          <div className="text-sm text-white/60">{error}</div>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-3">
          {blocks.map((block, index) => (
            <div
              key={`live-network-${block.hash}`}
              className="bg-white/5 rounded-lg p-4 transition-all duration-300 ease-in-out hover:bg-white/10 hover:shadow-lg border border-white/5 hover:border-white/20 cursor-pointer group"
              onClick={() => setSelectedBlock(block)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedBlock(block);
                }
              }}
              aria-label={`View details for block ${block.height}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getBlockIcon(block.modifier)}
                    <div className="text-white font-bold text-lg">
                      #{block.height}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        copyToClipboard(block.hash, block.hash);
                      }}
                      className="flex items-center space-x-1 px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md transition-colors text-xs"
                      title="Copy block hash"
                    >
                      {copied === block.hash ? (
                        <Check className="h-3 w-3 text-green-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>Copy</span>
                    </button>
                    <div className="flex items-center space-x-1 px-2 py-1 bg-blue-500/20 text-blue-300 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="h-3 w-3" />
                      <span>View Details</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-blue-200 text-sm font-medium">
                    {formatTime(block.time)}
                  </div>
                  <div className="text-xs text-white/60">
                    {index === 0 ? 'Latest' : `${index + 1} blocks ago`}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-blue-200 text-xs font-medium uppercase tracking-wide">
                    Hash
                  </div>
                  <div className="text-white font-mono text-xs break-all bg-black/20 p-2 rounded">
                    {block.hash.substring(0, 16)}...
                    {block.hash.substring(block.hash.length - 16)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-blue-200 text-xs font-medium uppercase tracking-wide">
                    Transactions
                  </div>
                  <div className="text-white font-semibold">
                    {block.nTx.toLocaleString()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-blue-200 text-xs font-medium uppercase tracking-wide">
                    Reward
                  </div>
                  <div className="text-white flex items-center space-x-1">
                    <Gift className="h-3 w-3 text-yellow-400" />
                    <span className="text-xs">
                      {block.reward !== undefined && block.reward > 0
                        ? `${block.reward.toFixed(8)} VRSC (${block.rewardType === 'pos' ? 'PoS' : 'PoW'})`
                        : 'Reward N/A'}
                    </span>
                  </div>
                  {block.hasStakeReward && (
                    <div
                      className={`mt-1 text-xs ${block.stakeRewardInfo?.blockType === 'pos' ? 'text-green-400' : 'text-yellow-400'} flex items-center space-x-1`}
                    >
                      <div
                        className={`w-1 h-1 ${block.stakeRewardInfo?.blockType === 'pos' ? 'bg-green-400' : 'bg-yellow-400'} rounded-full`}
                      ></div>
                      <span>
                        {block.stakeRewardInfo?.blockType === 'pos'
                          ? 'Stake'
                          : 'Mining'}
                        : {block.stakeRewardAmount?.toFixed(6)} VRSC
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-blue-200 text-xs font-medium uppercase tracking-wide">
                    Size
                  </div>
                  <div className="text-white font-semibold">
                    {formatSize(block.size)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-blue-200 text-xs font-medium uppercase tracking-wide">
                    Status
                  </div>
                  <div className="text-white">
                    <ConfirmationStatus
                      confirmations={block.confirmations || 0}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Block Detail Modal */}
      {selectedBlock && (
        <div
          ref={modalRef}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <div
            className="bg-gray-900 border border-gray-600 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl transform transition-all duration-300 ease-out"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800 to-gray-700">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl shadow-lg">
                  <Database className="h-7 w-7 text-blue-400" />
                </div>
                <div>
                  <h2
                    id="modal-title"
                    className="text-2xl font-bold text-white tracking-tight"
                  >
                    Block #{selectedBlock.height}
                  </h2>
                  <p
                    id="modal-description"
                    className="text-sm text-blue-200/80 mt-1"
                  >
                    {formatTime(selectedBlock.time)} • {selectedBlock.nTx}{' '}
                    transactions
                  </p>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                onClick={() => setSelectedBlock(null)}
                className="p-3 hover:bg-gray-600/50 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 hover:scale-105 active:scale-95"
                aria-label="Close modal"
              >
                <X className="h-6 w-6 text-gray-300 hover:text-white transition-colors" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] modal-scroll">
              {modalLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500/30 border-t-blue-500"></div>
                    <span className="text-blue-200/80 text-lg font-medium">
                      Loading block details...
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Basic Information */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Info className="h-5 w-5 text-green-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        Basic Information
                      </h3>
                    </div>
                    <div className="bg-gray-800/80 p-6 rounded-2xl border border-gray-600/50 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-gray-400 text-sm font-medium mb-1">
                            Height
                          </div>
                          <div className="text-white font-bold text-lg">
                            #{selectedBlock.height}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm font-medium mb-1">
                            Confirmations
                          </div>
                          <div className="text-white font-semibold">
                            {selectedBlock.confirmations || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm font-medium mb-1">
                            Size
                          </div>
                          <div className="text-white font-semibold">
                            {formatSize(selectedBlock.size)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm font-medium mb-1">
                            Weight
                          </div>
                          <div className="text-white font-semibold">
                            {selectedBlock.weight
                              ? `${selectedBlock.weight.toLocaleString()} WU`
                              : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm font-medium mb-1">
                            Transactions
                          </div>
                          <div className="text-white font-semibold">
                            {selectedBlock.nTx}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm font-medium mb-1">
                            Difficulty
                          </div>
                          <div className="text-white font-semibold">
                            {formatDifficulty(selectedBlock.difficulty)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Block Hash */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Hash className="h-5 w-5 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        Block Hash
                      </h3>
                    </div>
                    <div className="bg-gray-800/80 p-6 rounded-2xl border border-gray-600/50">
                      <div className="bg-gray-900/60 p-4 rounded-lg mb-4">
                        <code
                          className="text-sm text-gray-300 break-all leading-relaxed font-mono"
                          title={selectedBlock.hash}
                        >
                          {selectedBlock.hash.length > 40
                            ? `${selectedBlock.hash.substring(0, 20)}...${selectedBlock.hash.substring(selectedBlock.hash.length - 20)}`
                            : selectedBlock.hash}
                        </code>
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(selectedBlock.hash, 'hash')
                        }
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 text-sm font-medium hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        {copied === 'hash' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        <span>
                          {copied === 'hash' ? 'Copied!' : 'Copy Hash'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Technical Details */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Database className="h-5 w-5 text-purple-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        Technical Details
                      </h3>
                    </div>
                    <div className="bg-gray-800/80 p-6 rounded-2xl border border-gray-600/50 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-gray-400 text-sm font-medium mb-1">
                            Version
                          </div>
                          <div className="text-white font-semibold">
                            {selectedBlock.version}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm font-medium mb-1">
                            Nonce
                          </div>
                          <div className="text-white font-semibold font-mono">
                            {selectedBlock.nonce}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm font-medium mb-1">
                            Bits
                          </div>
                          <div className="text-white font-semibold font-mono">
                            {selectedBlock.bits}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm font-medium mb-1">
                            Block Type
                          </div>
                          <div className="text-white font-semibold capitalize">
                            {selectedBlock.blocktype || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chain Data */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-500/20 rounded-lg">
                        <Activity className="h-5 w-5 text-orange-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        Chain Data
                      </h3>
                    </div>
                    <div className="bg-gray-800/80 p-6 rounded-2xl border border-gray-600/50 space-y-4">
                      <div className="space-y-3">
                        {selectedBlock.previousblockhash && (
                          <div>
                            <div className="text-gray-400 text-sm font-medium mb-1">
                              Previous Block
                            </div>
                            <div className="text-white font-mono text-sm break-all bg-gray-900/60 p-2 rounded">
                              {selectedBlock.previousblockhash.substring(0, 20)}
                              ...
                              {selectedBlock.previousblockhash.substring(
                                selectedBlock.previousblockhash.length - 20
                              )}
                            </div>
                          </div>
                        )}
                        {selectedBlock.nextblockhash && (
                          <div>
                            <div className="text-gray-400 text-sm font-medium mb-1">
                              Next Block
                            </div>
                            <div className="text-white font-mono text-sm break-all bg-gray-900/60 p-2 rounded">
                              {selectedBlock.nextblockhash.substring(0, 20)}...
                              {selectedBlock.nextblockhash.substring(
                                selectedBlock.nextblockhash.length - 20
                              )}
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="text-gray-400 text-sm font-medium mb-1">
                            Merkle Root
                          </div>
                          <div className="text-white font-mono text-sm break-all bg-gray-900/60 p-2 rounded">
                            {selectedBlock.merkleroot.substring(0, 20)}...
                            {selectedBlock.merkleroot.substring(
                              selectedBlock.merkleroot.length - 20
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Block Reward */}
                  <div className="space-y-6 lg:col-span-2">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-yellow-500/20 rounded-lg">
                        <Gift className="h-5 w-5 text-yellow-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        Block Reward
                      </h3>
                    </div>
                    <div className="bg-gray-800/80 p-6 rounded-2xl border border-gray-600/50">
                      <div className="text-center">
                        {selectedBlock.reward !== undefined &&
                        selectedBlock.reward > 0 ? (
                          <div className="text-white">
                            <div className="text-2xl font-bold text-yellow-400">
                              {selectedBlock.reward.toFixed(8)} VRSC
                            </div>
                            <div className="text-gray-400 text-sm mt-2">
                              {selectedBlock.rewardType === 'pos'
                                ? 'Proof of Stake'
                                : 'Proof of Work'}{' '}
                              reward from coinbase transaction
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-400">
                            Block reward information is not available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
