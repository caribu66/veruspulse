'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';

interface RealtimeUpdate {
  type: 'block' | 'transaction' | 'mempool' | 'network' | 'staking';
  data: any;
  timestamp: number;
}

interface RealtimeConfig {
  enabled: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

interface UseRealtimeUpdatesReturn {
  isConnected: boolean;
  lastUpdate: RealtimeUpdate | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts: number;
  enableRealtime: () => void;
  disableRealtime: () => void;
  sendMessage: (message: any) => void;
}

const defaultConfig: RealtimeConfig = {
  enabled: false, // Disabled by default until WebSocket server is implemented
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
};

export function useRealtimeUpdates(
  onUpdate: (update: RealtimeUpdate) => void,
  config: Partial<RealtimeConfig> = {}
): UseRealtimeUpdatesReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const [lastUpdate, setLastUpdate] = useState<RealtimeUpdate | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef({ ...defaultConfig, ...config });

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    heartbeatTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
        startHeartbeat();
      }
    }, configRef.current.heartbeatInterval);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');

    try {
      // Use WebSocket for real-time updates
      const wsUrl =
        process.env.NODE_ENV === 'production'
          ? `wss://${window.location.host}/api/ws`
          : 'ws://localhost:3000/api/ws';

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        logger.info('WebSocket connected successfully');
        setIsConnected(true);
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        startHeartbeat();
      };

      wsRef.current.onmessage = event => {
        try {
          const update: RealtimeUpdate = JSON.parse(event.data);
          setLastUpdate(update);
          onUpdate(update);
        } catch (error) {
          logger.error('Failed to parse WebSocket message', error);
        }
      };

      wsRef.current.onclose = event => {
        logger.debug('WebSocket disconnected', {
          code: event.code,
          reason: event.reason,
        });
        setIsConnected(false);
        setConnectionStatus('disconnected');

        // Don't attempt to reconnect for connection refused errors (1006)
        // This typically means the server isn't running
        if (event.code === 1006) {
          logger.warn(
            'WebSocket server unavailable - disabling automatic reconnection'
          );
          configRef.current.enabled = false;
          setConnectionStatus('error');
          return;
        }

        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && configRef.current.enabled) {
          if (reconnectAttempts < configRef.current.maxReconnectAttempts) {
            setReconnectAttempts(prev => prev + 1);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, configRef.current.reconnectInterval);
          } else {
            logger.warn('Max reconnection attempts reached - giving up');
            setConnectionStatus('error');
          }
        }
      };

      wsRef.current.onerror = error => {
        // Only log errors if we're actually trying to use WebSocket
        logger.debug('WebSocket connection error', error);
        setConnectionStatus('error');
      };
    } catch (error) {
      logger.error('Failed to create WebSocket connection', error);
      setConnectionStatus('error');
    }
  }, [onUpdate, reconnectAttempts, startHeartbeat]);

  const enableRealtime = useCallback(() => {
    configRef.current.enabled = true;
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  const disableRealtime = useCallback(() => {
    configRef.current.enabled = false;
    cleanup();
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, [cleanup]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (configRef.current.enabled) {
      connect();
    }

    return cleanup;
  }, [connect, cleanup]);

  // Update config when it changes
  useEffect(() => {
    configRef.current = { ...defaultConfig, ...config };
  }, [config]);

  return {
    isConnected,
    lastUpdate,
    connectionStatus,
    reconnectAttempts,
    enableRealtime,
    disableRealtime,
    sendMessage,
  };
}

// Hook for specific data types
export function useRealtimeData<T>(
  dataType: string,
  initialData: T,
  transform?: (update: RealtimeUpdate) => T | null
) {
  const [data, setData] = useState<T>(initialData);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  const handleUpdate = useCallback(
    (update: RealtimeUpdate) => {
      if (update.type === dataType) {
        const transformedData = transform ? transform(update) : update.data;
        if (transformedData !== null) {
          setData(transformedData);
          setLastUpdateTime(update.timestamp);
        }
      }
    },
    [dataType, transform]
  );

  const realtime = useRealtimeUpdates(handleUpdate);

  return {
    data,
    lastUpdateTime,
    ...realtime,
  };
}

// Hook for chart data updates
export function useRealtimeChartData(dataType: string, maxPoints: number = 24) {
  const [chartData, setChartData] = useState<
    Array<{ timestamp: number; value: number }>
  >([]);

  const handleUpdate = useCallback(
    (update: RealtimeUpdate) => {
      if (update.type === dataType && update.data?.value !== undefined) {
        setChartData(prev => {
          const newData = [
            ...prev,
            {
              timestamp: update.timestamp,
              value: update.data.value,
            },
          ];

          // Keep only the last maxPoints
          return newData.slice(-maxPoints);
        });
      }
    },
    [dataType, maxPoints]
  );

  const realtime = useRealtimeUpdates(handleUpdate);

  return {
    chartData,
    ...realtime,
  };
}
