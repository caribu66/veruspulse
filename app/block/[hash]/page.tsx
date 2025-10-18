'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { Block, BlockApiResponse } from '@/lib/types/block-types';
import { BlockHeader } from '@/components/block/BlockHeader';
import { BlockDetailRow } from '@/components/block/BlockDetailRow';
import { TransactionDetail } from '@/components/block/TransactionDetail';
import { HeavyMetricsSection } from '@/components/block/HeavyMetricsSection';
import { BlockRewardSection } from '@/components/block/BlockRewardSection';
import { ValuePoolsSection } from '@/components/block/ValuePoolsSection';
import { BlockNavigation } from '@/components/block/BlockNavigation';
import { BlockSkeleton } from '@/components/block/BlockSkeleton';
import { BlockError } from '@/components/block/BlockError';

const BlockDetailsPage = ({
  params,
}: {
  params: Promise<{ hash: string }>;
}) => {
  const [block, setBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [heavyMetrics, setHeavyMetrics] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      setHash(resolvedParams.hash);
    };
    unwrapParams();
  }, [params]);

  const fetchBlock = useCallback(async () => {
    if (!hash) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/block/${hash}${heavyMetrics ? '?metrics=1' : ''}`
      );
      const result: BlockApiResponse = await response.json();

      if (result.success && result.data) {
        setBlock(result.data);
      } else {
        setError(result.error || 'Failed to fetch block details');
      }
    } catch (err) {
      setError('Network error while fetching block details');
      console.error('Error fetching block:', err);
    } finally {
      setLoading(false);
    }
  }, [hash, heavyMetrics]);

  useEffect(() => {
    fetchBlock();
  }, [fetchBlock]);

  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    fetchBlock();
  }, [fetchBlock]);

  // Memoized utility functions
  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  }, []);

  const formatSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatDifficulty = useCallback((difficulty: number) => {
    return (difficulty / 1e6).toFixed(2) + ' M';
  }, []);

  const formatHex = useCallback((hex: string, length: number = 8) => {
    if (hex.length <= length) return hex;
    return `${hex.substring(0, length)}...${hex.substring(hex.length - length)}`;
  }, []);

  // Memoized loading and error states
  const loadingState = useMemo(() => <BlockSkeleton />, []);

  const errorState = useMemo(
    () => (
      <BlockError
        error={error || 'Unknown error'}
        onRetry={handleRetry}
        blockHash={hash || undefined}
      />
    ),
    [error, handleRetry, hash]
  );

  if (loading) return loadingState;
  if (error) return errorState;
  if (!block) return errorState;

  return (
    <div className="min-h-screen theme-bg-primary">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 theme-text-primary">
        <div className="bg-gray-900 border border-gray-600 rounded-xl w-full mx-auto max-w-4xl p-6 shadow-2xl">
          {/* Header */}
          <BlockHeader
            block={block}
            heavyMetrics={heavyMetrics}
            onToggleHeavyMetrics={() => setHeavyMetrics(!heavyMetrics)}
          />

          {/* Main Block Details */}
          <div className="space-y-4">
            <BlockDetailRow label="Hash" value={block.hash} isHash copyable />
            <BlockDetailRow
              label="Confirmations"
              value={
                block.confirmations
                  ? block.confirmations.toLocaleString()
                  : 'N/A'
              }
            />
            <BlockDetailRow label="Time" value={formatTime(block.time)} />
            {block.mediantime && (
              <BlockDetailRow
                label="Median Time"
                value={formatTime(block.mediantime)}
              />
            )}
            {block.versionHex && (
              <BlockDetailRow
                label="Version (Hex)"
                value={block.versionHex}
                copyable
              />
            )}
            {block.validationtype && (
              <BlockDetailRow
                label="Validation Type"
                value={
                  block.validationtype.charAt(0).toUpperCase() +
                  block.validationtype.slice(1)
                }
              />
            )}
            {block.blocktype && (
              <BlockDetailRow
                label="Block Type"
                value={
                  block.blocktype.charAt(0).toUpperCase() +
                  block.blocktype.slice(1)
                }
              />
            )}
            {block.segid !== undefined && block.segid !== -2 && (
              <BlockDetailRow label="SegID" value={block.segid} />
            )}

            {/* Block Reward Section */}
            <BlockRewardSection block={block} />
            <BlockDetailRow
              label="Transactions"
              value={block.nTx || block.tx?.length || 0}
            />
            <BlockDetailRow label="Size" value={formatSize(block.size)} />
            <BlockDetailRow
              label="Difficulty"
              value={formatDifficulty(block.difficulty)}
            />
            <BlockDetailRow
              label="Weight"
              value={
                block.weight ? `${block.weight.toLocaleString()} WU` : 'N/A'
              }
            />
            <BlockDetailRow label="Version" value={block.version} />
            <BlockDetailRow label="Nonce" value={block.nonce} copyable />
            <BlockDetailRow label="Bits" value={block.bits} copyable />
            <BlockDetailRow
              label="Chainwork"
              value={block.chainwork}
              isHash
              copyable
            />
            {block.previousblockhash && (
              <BlockDetailRow
                label="Previous Block"
                value={block.previousblockhash}
                isHash
                isLink
                link={`/block/${block.previousblockhash}`}
                copyable
              />
            )}
            {block.nextblockhash && (
              <BlockDetailRow
                label="Next Block"
                value={block.nextblockhash}
                isHash
                isLink
                link={`/block/${block.nextblockhash}`}
                copyable
              />
            )}
            <BlockDetailRow
              label="Merkle Root"
              value={block.merkleroot}
              isHash
              copyable
            />
            {block.finalsaplingroot &&
              block.finalsaplingroot !==
                '0000000000000000000000000000000000000000000000000000000000000000' && (
                <BlockDetailRow
                  label="Final Sapling Root"
                  value={block.finalsaplingroot}
                  isHash
                  copyable
                />
              )}
            {block.anchor && (
              <BlockDetailRow
                label="Anchor"
                value={block.anchor}
                isHash
                copyable
              />
            )}

            {/* Heavy Metrics Section */}
            <HeavyMetricsSection block={block} />

            {/* Value Pools Section */}
            <ValuePoolsSection block={block} />

            {/* Advanced Details */}
            <div className="pt-2">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-blue-200 font-semibold hover:text-blue-300 transition-colors"
                aria-expanded={showAdvanced}
              >
                <span>Advanced Details</span>
                {showAdvanced ? (
                  <CaretUp className="h-5 w-5 transition-transform" />
                ) : (
                  <CaretDown className="h-5 w-5 transition-transform" />
                )}
              </button>
              {showAdvanced && (
                <div className="mt-2 space-y-3 bg-black/20 p-3 rounded-md">
                  {block.solution && (
                    <BlockDetailRow
                      label="Solution"
                      value={block.solution}
                      isHash
                      copyable
                    />
                  )}
                  {block.postarget && (
                    <BlockDetailRow
                      label="PoS Target"
                      value={block.postarget}
                      isHash
                      copyable
                    />
                  )}
                  {block.chainstake &&
                    block.chainstake !==
                      '0000000000000000000000000000000000000000000000000000000000000000' && (
                      <BlockDetailRow
                        label="Chain Stake"
                        value={block.chainstake}
                        isHash
                        copyable
                      />
                    )}
                  {block.poshashbh && (
                    <BlockDetailRow
                      label="PoS Hash (Block Header)"
                      value={block.poshashbh}
                      isHash
                      copyable
                    />
                  )}
                  {block.poshashtx && (
                    <BlockDetailRow
                      label="PoS Hash (Transaction)"
                      value={block.poshashtx}
                      isHash
                      copyable
                    />
                  )}
                  {block.possourcetxid && (
                    <BlockDetailRow
                      label="PoS Source TXID"
                      value={block.possourcetxid}
                      isHash
                      copyable
                    />
                  )}
                  {block.possourcevoutnum !== undefined && (
                    <BlockDetailRow
                      label="PoS Source Vout"
                      value={block.possourcevoutnum}
                    />
                  )}
                  {block.proofroot && (
                    <div className="space-y-2">
                      <div className="text-blue-200 font-semibold">
                        Proof Root
                      </div>
                      <div className="bg-gray-700/30 p-3 rounded-md space-y-2 text-sm">
                        <BlockDetailRow
                          label="Version"
                          value={block.proofroot.version}
                        />
                        <BlockDetailRow
                          label="Type"
                          value={block.proofroot.type}
                        />
                        <BlockDetailRow
                          label="System ID"
                          value={block.proofroot.systemid}
                        />
                        <BlockDetailRow
                          label="Height"
                          value={block.proofroot.height.toLocaleString()}
                        />
                        <BlockDetailRow
                          label="State Root"
                          value={block.proofroot.stateroot}
                          isHash
                          copyable
                        />
                        <BlockDetailRow
                          label="Block Hash"
                          value={block.proofroot.blockhash}
                          isHash
                          copyable
                        />
                        <BlockDetailRow
                          label="Power"
                          value={block.proofroot.power}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Transactions Section */}
            <div>
              <div className="text-blue-200 mb-1 mt-4 font-semibold">
                Transactions ({block.tx.length})
              </div>
              <div className="bg-black/20 p-2 rounded-md max-h-96 overflow-y-auto space-y-2">
                {block.tx.map((tx, index) => (
                  <TransactionDetail key={tx.txid} tx={tx} index={index} />
                ))}
              </div>
            </div>

            {/* Block Navigation */}
            <BlockNavigation block={block} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockDetailsPage;
