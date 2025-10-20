'use client';

import { useState } from 'react';
import {
  Shield,
  Key,
  Copy,
  Check,
  WarningCircle,
  CaretDown,
  CaretRight,
} from '@phosphor-icons/react';
import {
  formatCryptoValue,
  formatFriendlyNumber,
} from '@/lib/utils/number-formatting';

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

interface IdentityDetailsProps {
  verusID: VerusID;
  balance: VerusIDBalance | null;
  resolvedAuthorities: {
    revocation?: string;
    recovery?: string;
    parent?: string;
  };
}

export function VerusIDIdentityDetails({
  verusID,
  balance,
  resolvedAuthorities,
}: IdentityDetailsProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['authorities', 'properties'])
  );

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      // Silent error handling for clipboard
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

  const formatVRSC = (amount: number) => {
    return formatCryptoValue(amount, 'VRSC');
  };

  const formatVRSCShort = (amount: number) => {
    return formatFriendlyNumber(amount, { precision: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-verus-blue/20 to-verus-green/20 backdrop-blur-sm rounded-2xl p-6 border border-verus-blue/30">
        <div>
          <h3 className="text-2xl font-bold text-white mb-2 flex items-center space-x-3">
            <Shield className="h-7 w-7 text-verus-blue" />
            <span>Identity Details</span>
          </h3>
          <p className="text-sm text-purple-200">
            Technical specifications and security authorities
          </p>
        </div>
      </div>

      {/* Authorities Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700">
        <button
          onClick={() => toggleSection('authorities')}
          className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-verus-teal" />
            <h4 className="text-xl font-semibold text-white">Authorities</h4>
          </div>
          {expandedSections.has('authorities') ? (
            <CaretDown className="h-5 w-5 text-yellow-300" />
          ) : (
            <CaretRight className="h-5 w-5 text-yellow-300" />
          )}
        </button>
        {expandedSections.has('authorities') && (
          <div className="px-6 pb-6 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-blue-200 mb-3 font-medium flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Revocation Authority</span>
                </div>
                <div className="text-white text-sm break-all">
                  {resolvedAuthorities.revocation ? (
                    <div className="space-y-2">
                      <div className="font-medium text-yellow-300">
                        {resolvedAuthorities.revocation}
                      </div>
                      {verusID.revocationauthority && (
                        <div className="font-mono text-blue-600 dark:text-blue-200/80 text-xs bg-gray-200 dark:bg-black/20 p-2 rounded">
                          {verusID.revocationauthority}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="font-mono text-gray-400">
                      {verusID.revocationauthority || 'None'}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-blue-200 mb-3 font-medium flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Recovery Authority</span>
                </div>
                <div className="text-white text-sm break-all">
                  {resolvedAuthorities.recovery ? (
                    <div className="space-y-2">
                      <div className="font-medium text-green-300">
                        {resolvedAuthorities.recovery}
                      </div>
                      {verusID.recoveryauthority && (
                        <div className="font-mono text-blue-600 dark:text-blue-200/80 text-xs bg-gray-200 dark:bg-black/20 p-2 rounded">
                          {verusID.recoveryauthority}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="font-mono text-gray-400">
                      {verusID.recoveryauthority || 'None'}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-blue-200 mb-3 font-medium flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Parent</span>
                </div>
                <div className="text-white text-sm break-all">
                  {resolvedAuthorities.parent ? (
                    <div className="space-y-2">
                      <div className="font-medium text-purple-300">
                        {resolvedAuthorities.parent}
                      </div>
                      {verusID.parent && (
                        <div className="font-mono text-blue-600 dark:text-blue-200/80 text-xs bg-gray-200 dark:bg-black/20 p-2 rounded">
                          {verusID.parent}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="font-mono text-gray-400">
                      {verusID.parent || 'Root'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Properties Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700">
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
          {expandedSections.has('properties') ? (
            <CaretDown className="h-5 w-5 text-blue-300" />
          ) : (
            <CaretRight className="h-5 w-5 text-blue-300" />
          )}
        </button>
        {expandedSections.has('properties') && (
          <div className="px-6 pb-6 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg">
                  <span className="text-blue-200 text-sm">Can Revoke:</span>
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
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg">
                  <span className="text-blue-200 text-sm">Time Lock:</span>
                  <span className="text-white">{verusID.timelock}</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg">
                  <span className="text-blue-200 text-sm">Flags:</span>
                  <span className="text-white">{verusID.flags}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg">
                  <span className="text-blue-200 text-sm">Height:</span>
                  <span className="text-white">{verusID.height}</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg">
                  <span className="text-blue-200 text-sm">Version:</span>
                  <span className="text-white">{verusID.version}</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg">
                  <span className="text-blue-200 text-sm">
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

      {/* Addresses Section */}
      {balance &&
        balance.addressDetails &&
        balance.addressDetails.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => toggleSection('addresses')}
              className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Key className="h-6 w-6 text-green-400" />
                <h4 className="text-xl font-semibold text-white">
                  Associated Addresses
                </h4>
                <span className="text-sm text-blue-200 bg-blue-500/20 px-2 py-1 rounded">
                  {balance.addressDetails.length} addresses
                </span>
              </div>
              {expandedSections.has('addresses') ? (
                <CaretDown className="h-5 w-5 text-green-300" />
              ) : (
                <CaretRight className="h-5 w-5 text-green-300" />
              )}
            </button>
            {expandedSections.has('addresses') && (
              <div className="px-6 pb-6 border-t border-white/10">
                <div className="pt-6">
                  <div className="mb-4">
                    <div className="text-sm text-blue-200 mb-2 font-medium">
                      Address Hierarchy:
                    </div>
                    <div className="text-xs text-gray-400 mb-3">
                      I-Address (Identity) • Primary Addresses (Associated)
                    </div>
                  </div>
                  <div className="space-y-3">
                    {balance.addressDetails.map((addr, index) => (
                      <div
                        key={index}
                        className={`flex justify-between items-center rounded-lg p-4 ${
                          addr.isIdentityAddress
                            ? 'bg-green-500/20 border border-green-400/30 ring-1 ring-green-400/20'
                            : 'bg-white/5 border border-white/10'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="text-white font-mono text-sm break-all">
                              {addr.address}
                            </div>
                            {addr.isIdentityAddress ? (
                              <span className="px-2 py-1 bg-green-500/30 text-green-300 text-xs rounded-full flex-shrink-0">
                                I-Address
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-blue-500/30 text-blue-300 text-xs rounded-full flex-shrink-0">
                                Primary Address
                              </span>
                            )}
                            <button
                              onClick={() =>
                                copyToClipboard(addr.address, `addr-${index}`)
                              }
                              className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
                            >
                              {copied === `addr-${index}` ? (
                                <Check className="h-4 w-4 text-green-400" />
                              ) : (
                                <Copy className="h-4 w-4 text-blue-300" />
                              )}
                            </button>
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

                  {/* Explanation */}
                  <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="text-xs text-blue-200">
                      <strong>Note:</strong> &quot;Total Received&quot; shows
                      all funds ever received by this address. &quot;Total
                      Sent&quot; is calculated as (Received - Current Balance).
                      This is normal for addresses with transaction history.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      {/* ContentMap Section */}
      {verusID.contentmap && Object.keys(verusID.contentmap).length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700">
          <button
            onClick={() => toggleSection('contentmap')}
            className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Key className="h-6 w-6 text-verus-blue" />
              <h4 className="text-xl font-semibold text-white">Content Map</h4>
            </div>
            {expandedSections.has('contentmap') ? (
              <CaretDown className="h-5 w-5 text-purple-300" />
            ) : (
              <CaretRight className="h-5 w-5 text-purple-300" />
            )}
          </button>
          {expandedSections.has('contentmap') && (
            <div className="px-6 pb-6 border-t border-white/10">
              <div className="pt-6">
                <pre className="bg-gray-200 dark:bg-black/30 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
                  {JSON.stringify(verusID.contentmap, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
