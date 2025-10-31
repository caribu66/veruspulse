/**
 * Real-time Event Broadcasting
 * Uses Server-Sent Events (SSE) for real-time updates
 *
 * This is a lightweight alternative to WebSockets that works great with Next.js
 */

interface EventListener {
  id: string;
  controller: ReadableStreamDefaultController;
  connectedAt: Date;
}

class EventBroadcaster {
  private listeners: Map<string, EventListener> = new Map();

  addListener(id: string, controller: ReadableStreamDefaultController): void {
    this.listeners.set(id, {
      id,
      controller,
      connectedAt: new Date(),
    });
    console.info(
      `[Broadcaster] Client connected: ${id} (Total: ${this.listeners.size})`
    );
  }

  removeListener(id: string): void {
    this.listeners.delete(id);
    console.info(
      `[Broadcaster] Client disconnected: ${id} (Total: ${this.listeners.size})`
    );
  }

  broadcast(event: string, data: any): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    const deadListeners: string[] = [];

    this.listeners.forEach((listener, id) => {
      try {
        listener.controller.enqueue(encoded);
      } catch (error) {
        console.error(`[Broadcaster] Failed to send to ${id}:`, error);
        deadListeners.push(id);
      }
    });

    // Clean up dead listeners
    deadListeners.forEach(id => this.removeListener(id));
  }

  getListenerCount(): number {
    return this.listeners.size;
  }

  getListeners(): EventListener[] {
    return Array.from(this.listeners.values());
  }
}

// Singleton broadcaster instance
const broadcaster = new EventBroadcaster();

/**
 * Broadcast a new block notification
 */
export async function broadcastNewBlock(
  blockHashOrHeight: string
): Promise<void> {
  broadcaster.broadcast('new-block', {
    block: blockHashOrHeight,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast a new transaction
 */
export async function broadcastNewTransaction(txid: string): Promise<void> {
  broadcaster.broadcast('new-transaction', {
    txid,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast a VerusID update
 */
export async function broadcastVerusIDUpdate(
  iaddr: string,
  name: string
): Promise<void> {
  broadcaster.broadcast('verusid-update', {
    iaddr,
    name,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast generic event
 */
export function broadcast(event: string, data: any): void {
  broadcaster.broadcast(event, data);
}

/**
 * Add a new SSE listener
 */
export function addListener(
  id: string,
  controller: ReadableStreamDefaultController
): void {
  broadcaster.addListener(id, controller);
}

/**
 * Remove an SSE listener
 */
export function removeListener(id: string): void {
  broadcaster.removeListener(id);
}

/**
 * Get statistics about connected listeners
 */
export function getStats(): {
  connected: number;
  listeners: Array<{ id: string; connectedAt: Date }>;
} {
  return {
    connected: broadcaster.getListenerCount(),
    listeners: broadcaster.getListeners().map(l => ({
      id: l.id,
      connectedAt: l.connectedAt,
    })),
  };
}

export default broadcaster;
