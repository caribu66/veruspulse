/**
 * React hook for real-time blockchain events via Server-Sent Events (SSE)
 *
 * Usage:
 * const { connected, lastBlock, lastTransaction } = useRealtimeEvents({
 *   onNewBlock: (block) => console.log('New block:', block),
 *   onNewTransaction: (txid) => console.log('New tx:', txid),
 * });
 */

import { useEffect, useState, useCallback, useRef } from 'react';

interface RealtimeEventsConfig {
  onNewBlock?: (blockHashOrHeight: string) => void;
  onNewTransaction?: (txid: string) => void;
  onVerusIDUpdate?: (data: { iaddr: string; name: string }) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
}

interface RealtimeEventsState {
  connected: boolean;
  lastBlock: string | null;
  lastTransaction: string | null;
  lastVerusIDUpdate: { iaddr: string; name: string } | null;
  error: string | null;
}

export function useRealtimeEvents(config: RealtimeEventsConfig = {}) {
  const {
    onNewBlock,
    onNewTransaction,
    onVerusIDUpdate,
    onConnected,
    onDisconnected,
    onError,
    autoReconnect = true,
  } = config;

  const [state, setState] = useState<RealtimeEventsState>({
    connected: false,
    lastBlock: null,
    lastTransaction: null,
    lastVerusIDUpdate: null,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const autoReconnectRef = useRef(autoReconnect);

  // Store callbacks in refs to avoid recreating connect/disconnect on every render
  const callbacksRef = useRef({
    onNewBlock,
    onNewTransaction,
    onVerusIDUpdate,
    onConnected,
    onDisconnected,
    onError,
  });

  // Update refs when callbacks or autoReconnect change
  useEffect(() => {
    callbacksRef.current = {
      onNewBlock,
      onNewTransaction,
      onVerusIDUpdate,
      onConnected,
      onDisconnected,
      onError,
    };
    autoReconnectRef.current = autoReconnect;
  }, [
    onNewBlock,
    onNewTransaction,
    onVerusIDUpdate,
    onConnected,
    onDisconnected,
    onError,
    autoReconnect,
  ]);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource('/api/events');
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('message', e => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'connected') {
            console.log('[Realtime] Connected to event stream');
            setState(prev => ({ ...prev, connected: true, error: null }));
            reconnectAttemptsRef.current = 0;
            callbacksRef.current.onConnected?.();
          }
        } catch (error) {
          console.error('[Realtime] Error parsing message:', error);
        }
      });

      eventSource.addEventListener('new-block', e => {
        try {
          const data = JSON.parse(e.data);
          console.log('[Realtime] New block:', data.block);
          setState(prev => ({ ...prev, lastBlock: data.block }));
          callbacksRef.current.onNewBlock?.(data.block);
        } catch (error) {
          console.error('[Realtime] Error parsing new-block event:', error);
        }
      });

      eventSource.addEventListener('new-transaction', e => {
        try {
          const data = JSON.parse(e.data);
          console.log('[Realtime] New transaction:', data.txid);
          setState(prev => ({ ...prev, lastTransaction: data.txid }));
          callbacksRef.current.onNewTransaction?.(data.txid);
        } catch (error) {
          console.error(
            '[Realtime] Error parsing new-transaction event:',
            error
          );
        }
      });

      eventSource.addEventListener('verusid-update', e => {
        try {
          const data = JSON.parse(e.data);
          console.log('[Realtime] VerusID update:', data);
          setState(prev => ({
            ...prev,
            lastVerusIDUpdate: { iaddr: data.iaddr, name: data.name },
          }));
          callbacksRef.current.onVerusIDUpdate?.(data);
        } catch (error) {
          console.error(
            '[Realtime] Error parsing verusid-update event:',
            error
          );
        }
      });

      eventSource.onerror = error => {
        console.error('[Realtime] EventSource error:', error);
        setState(prev => ({
          ...prev,
          connected: false,
          error: 'Connection lost',
        }));
        callbacksRef.current.onError?.(error);
        callbacksRef.current.onDisconnected?.();

        // Attempt to reconnect with exponential backoff
        if (autoReconnectRef.current) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          reconnectAttemptsRef.current++;
          console.log(
            `[Realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('[Realtime] Failed to create EventSource:', error);
      setState(prev => ({
        ...prev,
        connected: false,
        error: 'Failed to connect',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setState(prev => ({ ...prev, connected: false }));
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    reconnect: connect,
    disconnect,
  };
}
