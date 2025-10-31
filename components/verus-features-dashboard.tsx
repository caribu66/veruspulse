'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  User,
  Coins,
  Link,
  Shield,
  Lightning,
  Globe,
  MagnifyingGlass,
  Eye,
  Lock,
  LockOpen,
  Network,
  Hash,
  TrendUp,
  WarningCircle,
  CheckCircle,
  ArrowsClockwise,
} from '@phosphor-icons/react';

interface VerusIdentity {
  identity: {
    name: string;
    primaryaddresses: string[];
    minimumsignatures: number;
    revocationauthority: string;
    recoveryauthority: string;
    timelock: number;
    flags: number;
  };
  name: string;
}

interface VerusCurrency {
  version: number;
  name: string;
  fullyqualifiedname: string;
  currencyid: string;
  currencyidhex: string;
  parent: string;
  systemid: string;
  launchsystemid: string;
  notarizationprotocol: number;
  proofprotocol: number;
  startblock: number;
  endblock: number;
  currencies: any[];
  weights: number[];
  conversions: any[];
  initialsupply: number;
  prelaunchcarveout: number;
  initialcontributions: any[];
  idregistrationfees: number;
  idreferrallevels: number;
  idimportfees: number;
  currencyregistrationfees: number;
  pbaassystemlaunchfees: number;
  currencyexportfees: number;
  currencyimportfees: number;
  transactionexportfees: number;
  transactionimportfees: number;
  pbaassystemconsensus: number;
  confirmednotarization: any;
  besttxid: string;
  confirmedtxid: string;
}

interface VerusPBaaS {
  chainid: string;
  name: string;
  description: string;
  version: number;
  options: number;
  systemid: string;
  parent: string;
  launchsystemid: string;
  startblock: number;
  endblock: number;
  notarizationprotocol: number;
  proofprotocol: number;
  currencies: any[];
  weights: number[];
  conversions: any[];
  initialsupply: number;
  prelaunchcarveout: number;
  initialcontributions: any[];
  idregistrationfees: number;
  idreferrallevels: number;
  idimportfees: number;
  currencyregistrationfees: number;
  pbaassystemlaunchfees: number;
  currencyexportfees: number;
  currencyimportfees: number;
  transactionexportfees: number;
  transactionimportfees: number;
  pbaassystemconsensus: number;
  confirmednotarization: any;
}

export function VerusFeaturesDashboard() {
  const tCommon = useTranslations('common');
  const t = useTranslations('dashboard');
  const tNetwork = useTranslations('network');
  const tVerusId = useTranslations('verusid');

  const [identities, setIdentities] = useState<VerusIdentity[]>([]);
  const [currency, setCurrency] = useState<VerusCurrency | null>(null);
  const [notarizationData, setNotarizationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<
    'identities' | 'currencies' | 'pbaas'
  >('identities');

  const fetchVerusData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [identitiesRes, currenciesRes, pbaasRes] = await Promise.allSettled(
        [
          fetch('/api/verus-identities'),
          fetch('/api/verus-currencies'),
          fetch('/api/verus-pbaas'),
        ]
      );

      if (identitiesRes.status === 'fulfilled') {
        const identitiesData = await identitiesRes.value.json();
        if (identitiesData.success) {
          setIdentities(identitiesData.data.identities || []);
        }
      }

      if (currenciesRes.status === 'fulfilled') {
        const currenciesData = await currenciesRes.value.json();
        if (currenciesData.success) {
          setCurrency(currenciesData.data.currency || null);
        }
      }

      if (pbaasRes.status === 'fulfilled') {
        const pbaasData = await pbaasRes.value.json();
        if (pbaasData.success) {
          setNotarizationData(pbaasData.data.notarizationData || null);
        }
      }
    } catch (error: any) {
      setError('Failed to fetch Verus blockchain data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerusData();
  }, []);

  const filteredIdentities = identities.filter(
    identity =>
      identity.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      identity.identity?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCurrencies =
    currency &&
    (currency.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      currency.fullyqualifiedname
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()))
      ? [currency]
      : [];

  const filteredPBaaS =
    notarizationData &&
    (notarizationData.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(notarizationData)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()))
      ? [notarizationData]
      : [];

  return (
    <div className="space-y-8 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Verus Blockchain Features</h2>
          <p className="text-blue-200 text-sm mt-1">
            Explore Verus&apos;s unique identity system, currencies, and PBaaS
            chains
          </p>
        </div>
        <button
          onClick={fetchVerusData}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
        >
          <ArrowsClockwise
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          <span>{tCommon("refresh")}</span>
        </button>
      </div>

      {/* MagnifyingGlass */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <div className="flex items-center space-x-3">
          <MagnifyingGlass className="h-5 w-5 text-blue-400" />
          <input
            type="text"
            placeholder="MagnifyingGlass identities, currencies, or PBaaS chains..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-blue-200 focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4">
        <button
          onClick={() => setSelectedTab('identities')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            selectedTab === 'identities'
              ? 'bg-blue-500 text-white'
              : 'bg-white/10 text-blue-200 hover:bg-white/20'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Identities ({identities.length})</span>
        </button>
        <button
          onClick={() => setSelectedTab('currencies')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            selectedTab === 'currencies'
              ? 'bg-blue-500 text-white'
              : 'bg-white/10 text-blue-200 hover:bg-white/20'
          }`}
        >
          <Coins className="h-4 w-4" />
          <span>Currency ({currency ? 1 : 0})</span>
        </button>
        <button
          onClick={() => setSelectedTab('pbaas')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            selectedTab === 'pbaas'
              ? 'bg-blue-500 text-white'
              : 'bg-white/10 text-blue-200 hover:bg-white/20'
          }`}
        >
          <Link className="h-4 w-4" />
          <span>Notarization ({notarizationData ? 1 : 0})</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20">
          <div className="flex items-center space-x-3">
            <WarningCircle className="h-6 w-6 text-red-400" />
            <div>
              <h3 className="text-lg font-bold text-red-400">{tCommon("error")}</h3>
              <p className="text-red-200 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Identities Tab */}
      {selectedTab === 'identities' && (
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Verus Identity System
            </h3>
            <p className="text-blue-200 text-sm mb-4">
              Verus identities provide human-readable names on the blockchain
              with built-in security features.
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                <span className="ml-3 text-blue-200">
                  Loading identities...
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIdentities.map((identity, index) => (
                  <div
                    key={index}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <User className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">
                          {identity.name || identity.identity?.name}
                        </div>
                        <div className="text-blue-200 text-xs">
                          Verus Identity
                        </div>
                      </div>
                    </div>
                    {identity.identity && (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-blue-300">Addresses:</span>
                          <span className="text-white">
                            {identity.identity.primaryaddresses?.length || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-300">Min Signatures:</span>
                          <span className="text-white">
                            {identity.identity.minimumsignatures || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-300">Timelock:</span>
                          <span className="text-white">
                            {identity.identity.timelock || 0}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Currencies Tab */}
      {selectedTab === 'currencies' && (
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <Coins className="h-5 w-5 mr-2" />
              Verus Currency System
            </h3>
            <p className="text-blue-200 text-sm mb-4">
              Current chain currency information with Verus&apos;s native
              currency system.
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                <span className="ml-3 text-blue-200">
                  Loading currencies...
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCurrencies.map((currency, index) => (
                  <div
                    key={index}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 rounded-lg bg-verus-cyan/20">
                        <Coins className="h-4 w-4 text-verus-cyan" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">
                          {currency.name}
                        </div>
                        <div className="text-blue-200 text-xs">
                          {currency.fullyqualifiedname}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-blue-300">Version:</span>
                        <span className="text-white">{currency.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-300">Start Block:</span>
                        <span className="text-white">
                          {currency.startblock}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-300">Currency ID:</span>
                        <span className="text-white font-mono text-xs">
                          {currency.currencyid?.substring(0, 16)}...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-300">Initial Supply:</span>
                        <span className="text-white">
                          {currency.initialsupply?.toLocaleString() || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-300">System ID:</span>
                        <span className="text-white font-mono text-xs">
                          {currency.systemid?.substring(0, 16)}...
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PBaaS Tab */}
      {selectedTab === 'pbaas' && (
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <Link className="h-5 w-5 mr-2" />
              Notarization System
            </h3>
            <p className="text-blue-200 text-sm mb-4">
              Verus notarization system enables cross-chain interoperability and
              PBaaS functionality.
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                <span className="ml-3 text-blue-200">
                  Loading notarization data...
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPBaaS.map((data, index) => (
                  <div
                    key={index}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 rounded-lg bg-verus-blue/20">
                        <Link className="h-4 w-4 text-verus-blue" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">
                          Notarization Data
                        </div>
                        <div className="text-blue-200 text-xs">
                          Cross-chain System
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-blue-300">Version:</span>
                        <span className="text-white">
                          {data.version || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-300">Data Available:</span>
                        <span className="text-white">
                          {data ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-300">Type:</span>
                        <span className="text-white">Notarization</span>
                      </div>
                    </div>
                    {data && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="text-blue-200 text-xs">
                          {JSON.stringify(data).substring(0, 100)}...
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verus Features Info */}
      <div className="bg-gradient-to-r from-verus-blue/10 to-verus-green/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Verus Unique Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <User className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold">Identity System</h4>
              <p className="text-blue-200 text-sm mt-1">
                Human-readable names with built-in security and recovery
                mechanisms.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-verus-cyan/20">
              <Coins className="h-5 w-5 text-verus-cyan" />
            </div>
            <div>
              <h4 className="text-white font-semibold">Native Currencies</h4>
              <p className="text-blue-200 text-sm mt-1">
                Multiple currencies with DeFi features built into the protocol.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-verus-blue/20">
              <Link className="h-5 w-5 text-verus-blue" />
            </div>
            <div>
              <h4 className="text-white font-semibold">PBaaS</h4>
              <p className="text-blue-200 text-sm mt-1">
                Launch interoperable blockchains with full Verus feature set.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
