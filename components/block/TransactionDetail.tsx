'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink, Coins, ArrowRight } from 'lucide-react';
import Link from 'next/link';

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

interface TransactionDetailProps {
  tx: Transaction;
  index: number;
}

export function TransactionDetail({ tx, index }: TransactionDetailProps) {
  const [copied, setCopied] = useState(false);

  const totalOutput = tx.vout?.reduce((sum, out) => sum + out.value, 0) || 0;
  const isCoinbase = tx.vin?.some(vin => vin.coinbase) || false;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 20) return address;
    return `${address.substring(0, 10)}...${address.substring(address.length - 6)}`;
  };

  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-blue-200 font-semibold text-sm">
              #{index + 1}
            </span>
            {isCoinbase && (
              <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded">
                Coinbase
              </span>
            )}
            <span className="text-gray-400 text-xs">TXID:</span>
          </div>
          <div className="font-mono text-white text-xs break-all overflow-wrap-anywhere flex items-center space-x-2">
            <span className="flex-1">{tx.txid}</span>
            <button
              onClick={() => handleCopy(tx.txid)}
              className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
              title="Copy transaction ID"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <Copy className="h-3 w-3 text-gray-400 hover:text-white" />
              )}
            </button>
          </div>
        </div>
        <div className="text-white font-semibold text-sm whitespace-nowrap bg-green-500/20 px-3 py-1 rounded flex items-center space-x-1">
          <Coins className="h-4 w-4" />
          <span>{totalOutput.toFixed(8)} VRSC</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inputs */}
        <div>
          <div className="text-blue-200 mb-2 text-sm font-medium flex items-center space-x-2">
            <ArrowRight className="h-4 w-4" />
            <span>Inputs ({tx.vin?.length || 0})</span>
          </div>
          <div className="bg-gray-700/30 p-3 rounded-md space-y-2 max-h-32 overflow-y-auto">
            {tx.vin?.map((vin, vinIndex) => (
              <div key={`vin-${vinIndex}`} className="text-xs">
                {vin.coinbase ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400 font-semibold">
                      Coinbase
                    </span>
                    <span className="text-gray-500 text-xs">
                      {vin.coinbase.substring(0, 20)}...
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-white break-all flex-1 min-w-0">
                      {vin.txid ? (
                        <Link
                          href={`/transaction/${vin.txid}`}
                          className="text-blue-400 hover:underline"
                        >
                          {formatAddress(vin.txid)}
                        </Link>
                      ) : (
                        'Unknown'
                      )}
                    </div>
                    <span className="text-gray-400 ml-2">vout:{vin.vout}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Outputs */}
        <div>
          <div className="text-blue-200 mb-2 text-sm font-medium flex items-center space-x-2">
            <Coins className="h-4 w-4" />
            <span>Outputs ({tx.vout?.length || 0})</span>
          </div>
          <div className="bg-gray-700/30 p-3 rounded-md space-y-2 max-h-32 overflow-y-auto">
            {tx.vout?.map(vout => (
              <div
                key={vout.n}
                className="flex justify-between items-center text-xs"
              >
                <div className="flex-1 min-w-0 mr-2">
                  <div className="text-white font-mono break-all">
                    {vout.scriptPubKey?.addresses?.[0] ? (
                      <Link
                        href={`/address/${vout.scriptPubKey.addresses[0]}`}
                        className="text-blue-400 hover:underline"
                      >
                        {formatAddress(vout.scriptPubKey.addresses[0])}
                      </Link>
                    ) : (
                      <span className="text-gray-400">
                        {vout.scriptPubKey?.type || 'Unknown'}
                      </span>
                    )}
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

      {/* Transaction Metadata */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-400">
          <div>
            <span className="text-blue-200">Version:</span> {tx.version}
          </div>
          <div>
            <span className="text-blue-200">Locktime:</span> {tx.locktime}
          </div>
          <div>
            <span className="text-blue-200">Inputs:</span> {tx.vin?.length || 0}
          </div>
          <div>
            <span className="text-blue-200">Outputs:</span>{' '}
            {tx.vout?.length || 0}
          </div>
        </div>
      </div>
    </div>
  );
}
