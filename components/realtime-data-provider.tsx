'use client';

import { useTranslations } from 'next-intl';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  useRealtimeUpdates,
  useRealtimeData,
  useRealtimeChartData,
} from '@/lib/hooks/use-realtime-updates';

interface RealtimeData {
  blocks: any;
  mempool: any;
  network: any;
  staking: any;
  chartData: {
    hashRate: Array<{ timestamp: number; value: number }>;
    difficulty: Array<{ timestamp: number; value: number }>;
    mempool: Array<{ timestamp: number; value: number }>;
    blockTime: Array<{ timestamp: number; value: number }>;
  };
}

interface RealtimeContextType {
  data: RealtimeData;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: any;
  updateCount: number;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(
  undefined
);

interface RealtimeDataProviderProps {
  children: ReactNode;
}

export function RealtimeDataProvider({ children }: RealtimeDataProviderProps) {
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<any>(null);

  // Real-time data hooks for different data types
  const blocksData = useRealtimeData('block', null);
  const mempoolData = useRealtimeData('mempool', {
    size: 0,
    bytes: 0,
    feeRate: 0,
  });
  const networkData = useRealtimeData('network', {
    hashRate: 0,
    difficulty: 0,
    connections: 0,
  });
  const stakingData = useRealtimeData('staking', {
    netStakeWeight: 0,
    estimatedAPY: '0.00',
    activeStakers: 0,
  });

  // Chart data hooks
  const hashRateChart = useRealtimeChartData('network', 24);
  const difficultyChart = useRealtimeChartData('network', 24);
  const mempoolChart = useRealtimeChartData('mempool', 24);
  const blockTimeChart = useRealtimeChartData('block', 24);

  // Main real-time updates handler
  const { isConnected, connectionStatus } = useRealtimeUpdates(update => {
    setUpdateCount(prev => prev + 1);
    setLastUpdate(update);
  });

  const contextValue: RealtimeContextType = {
    data: {
      blocks: blocksData.data,
      mempool: mempoolData.data,
      network: networkData.data,
      staking: stakingData.data,
      chartData: {
        hashRate: hashRateChart.chartData,
        difficulty: difficultyChart.chartData,
        mempool: mempoolChart.chartData,
        blockTime: blockTimeChart.chartData,
      },
    },
    isConnected,
    connectionStatus,
    lastUpdate,
    updateCount,
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error(
      'useRealtimeContext must be used within a RealtimeDataProvider'
    );
  }
  return context;
}

// Hook for specific real-time data
export function useRealtimeBlocks() {
  const { data } = useRealtimeContext();
  return data.blocks;
}

export function useRealtimeMempool() {
  const { data } = useRealtimeContext();
  return data.mempool;
}

export function useRealtimeNetwork() {
  const { data } = useRealtimeContext();
  return data.network;
}

export function useRealtimeStaking() {
  const { data } = useRealtimeContext();
  return data.staking;
}

export function useRealtimeCharts() {
  const { data } = useRealtimeContext();
  return data.chartData;
}
