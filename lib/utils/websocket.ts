import { logger } from './logger';
import { useState, useEffect } from 'react';

// WebSocket utility for real-time data streaming
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private url: string;
  private onMessage: (data: any) => void;
  private onError: (error: Event) => void;
  private onConnect: () => void;
  private onDisconnect: () => void;

  constructor(
    url: string,
    onMessage: (data: any) => void,
    onError: (error: Event) => void,
    onConnect: () => void,
    onDisconnect: () => void
  ) {
    this.url = url;
    this.onMessage = onMessage;
    this.onError = onError;
    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;
  }

  connect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        logger.info('🔌 WebSocket connected');
        this.reconnectAttempts = 0;
        this.onConnect();
      };

      this.ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage(data);
        } catch (error) {
          logger.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        logger.warn('🔌 WebSocket disconnected');
        this.onDisconnect();
        this.attemptReconnect();
      };

      this.ws.onerror = error => {
        logger.error('❌ WebSocket error:', error);
        this.onError(error);
      };
    } catch (error) {
      logger.error('❌ Failed to create WebSocket connection:', error);
      this.onError(error as Event);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      logger.warn('🚫 WebSocket not connected, cannot send message');
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.info(
        `🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval * this.reconnectAttempts);
    } else {
      logger.error('❌ Max reconnection attempts reached');
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// WebSocket hook for React components
export function useWebSocket(
  url: string,
  onMessage: (data: any) => void,
  onError: (error: Event) => void,
  onConnect: () => void,
  onDisconnect: () => void
) {
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const manager = new WebSocketManager(
      url,
      onMessage,
      onError,
      () => {
        setIsConnected(true);
        onConnect();
      },
      () => {
        setIsConnected(false);
        onDisconnect();
      }
    );

    setWsManager(manager);
    manager.connect();

    return () => {
      manager.disconnect();
    };
  }, [url, onMessage, onError, onConnect, onDisconnect]);

  return {
    wsManager,
    isConnected,
    send: (data: any) => wsManager?.send(data),
    disconnect: () => wsManager?.disconnect(),
    reconnect: () => wsManager?.connect(),
  };
}

// Real-time data types
export interface LiveBlockData {
  type: 'new_block';
  block: {
    hash: string;
    height: number;
    time: number;
    size: number;
    nTx: number;
    difficulty: number;
  };
}

export interface LiveTransactionData {
  type: 'new_transaction';
  transaction: {
    txid: string;
    size: number;
    fee: number;
    time: number;
  };
}

export interface LiveMempoolData {
  type: 'mempool_update';
  mempool: {
    size: number;
    bytes: number;
    usage: number;
  };
}

export type LiveData = LiveBlockData | LiveTransactionData | LiveMempoolData;
