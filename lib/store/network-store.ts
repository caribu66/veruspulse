'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface NetworkStats {
  blocks: number;
  chain: string;
  difficulty: number;
  bestBlockHash: string;
  verificationProgress: number;
  connections: number;
  networkActive: boolean;
  chainwork: string;
  sizeOnDisk: number;
  commitments: number;
  circulatingSupply: number;
  valuePools: Array<{
    id: string;
    monitored: boolean;
    chainValue: number;
    chainValueZat: number;
  }>;
}

export interface MiningStats {
  blocks: number;
  currentblocksize: number;
  currentblocktx: number;
  difficulty: number;
  networkhashps: number;
  pooledtx: number;
  chain: string;
  warnings: string;
}

export interface MempoolStats {
  size: number;
  bytes: number;
  usage: number;
  maxmempool: number;
  mempoolminfee: number;
  minrelaytxfee: number;
}

export interface StakingStats {
  enabled: boolean;
  staking: boolean;
  errors: string;
  currentblocksize: number;
  currentblocktx: number;
  pooledtx: number;
  difficulty: number;
  searchInterval: number;
  weight: number;
  netstakeweight: number;
  chainstake: number;
  eligible_staking_outputs: number;
  eligible_staking_balance: number;
  expectedtime: number;
}

export interface PBaaSChain {
  currencydefinition: {
    name: string;
    fullyqualifiedname: string;
    options: number;
    startblock: number;
    endblock: number;
    initialsupply: number;
    maxsupply: number;
  };
  bestheight: number;
}

interface NetworkState {
  // Data
  networkStats: NetworkStats | null;
  miningStats: MiningStats | null;
  mempoolStats: MempoolStats | null;
  stakingStats: StakingStats | null;
  pbaasChains: PBaaSChain[];

  // UI State
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;

  // Actions
  setNetworkStats: (stats: NetworkStats | null) => void;
  setMiningStats: (stats: MiningStats | null) => void;
  setMempoolStats: (stats: MempoolStats | null) => void;
  setStakingStats: (stats: StakingStats | null) => void;
  setPbaasChains: (chains: PBaaSChain[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdate: (date: Date | null) => void;
  clearError: () => void;
  reset: () => void;
  clearOldData: () => void;
}

export const useNetworkStore = create<NetworkState>()(
  devtools(
    persist(
      set => {
        return {
          // Initial state
          networkStats: null,
          miningStats: null,
          mempoolStats: null,
          stakingStats: null,
          pbaasChains: [],
          loading: false,
          error: null,
          lastUpdate: null,

          // Actions
          setNetworkStats: stats => {
            if (process.env.NODE_ENV === 'development') {
              console.log('Store: setNetworkStats called with:', stats);
            }
            set({ networkStats: stats }, false, 'setNetworkStats');
          },
          setMiningStats: stats => {
            set({ miningStats: stats }, false, 'setMiningStats');
          },
          setMempoolStats: stats => {
            set({ mempoolStats: stats }, false, 'setMempoolStats');
          },
          setStakingStats: stats => {
            set({ stakingStats: stats }, false, 'setStakingStats');
          },
          setPbaasChains: chains =>
            set({ pbaasChains: chains }, false, 'setPbaasChains'),
          setLoading: loading => set({ loading }, false, 'setLoading'),
          setError: error => set({ error }, false, 'setError'),
          setLastUpdate: date =>
            set({ lastUpdate: date }, false, 'setLastUpdate'),
          clearError: () => set({ error: null }, false, 'clearError'),
          reset: () =>
            set(
              {
                networkStats: null,
                miningStats: null,
                mempoolStats: null,
                stakingStats: null,
                pbaasChains: [],
                loading: false,
                error: null,
                lastUpdate: null,
              },
              false,
              'reset'
            ),
          // Memory management action
          clearOldData: () => {
            const state = useNetworkStore.getState();
            // Only clear if data is older than 5 minutes to prevent unnecessary clearing
            if (
              state.lastUpdate &&
              Date.now() - state.lastUpdate.getTime() > 300000
            ) {
              set(
                {
                  networkStats: null,
                  miningStats: null,
                  mempoolStats: null,
                  stakingStats: null,
                  pbaasChains: [],
                  loading: false,
                  error: null,
                  lastUpdate: null,
                },
                false,
                'clearOldData'
              );
            }
          },
        };
      },
      {
        name: 'network-store',
      }
    ),
    {
      name: 'network-store-devtools',
    }
  )
);

// Selectors for optimized re-renders
export const useNetworkStats = () =>
  useNetworkStore(state => state.networkStats);
export const useMiningStats = () => useNetworkStore(state => state.miningStats);
export const useMempoolStats = () =>
  useNetworkStore(state => state.mempoolStats);
export const useStakingStats = () =>
  useNetworkStore(state => state.stakingStats);
export const usePbaasChains = () => useNetworkStore(state => state.pbaasChains);
export const useNetworkLoading = () => useNetworkStore(state => state.loading);
export const useNetworkError = () => useNetworkStore(state => state.error);
export const useLastUpdate = () => useNetworkStore(state => state.lastUpdate);

// Action selectors
export const useNetworkActions = () => {
  const setNetworkStats = useNetworkStore(state => state.setNetworkStats);
  const setMiningStats = useNetworkStore(state => state.setMiningStats);
  const setMempoolStats = useNetworkStore(state => state.setMempoolStats);
  const setStakingStats = useNetworkStore(state => state.setStakingStats);
  const setPbaasChains = useNetworkStore(state => state.setPbaasChains);
  const setLoading = useNetworkStore(state => state.setLoading);
  const setError = useNetworkStore(state => state.setError);
  const setLastUpdate = useNetworkStore(state => state.setLastUpdate);
  const clearError = useNetworkStore(state => state.clearError);
  const reset = useNetworkStore(state => state.reset);
  const clearOldData = useNetworkStore(state => state.clearOldData);

  return {
    setNetworkStats,
    setMiningStats,
    setMempoolStats,
    setStakingStats,
    setPbaasChains,
    setLoading,
    setError,
    setLastUpdate,
    clearError,
    reset,
    clearOldData,
  };
};
