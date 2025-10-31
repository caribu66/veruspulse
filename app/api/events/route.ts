import { type NextRequest } from 'next/server';
import { addListener, removeListener } from '@/lib/websocket/broadcaster';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Server-Sent Events (SSE) endpoint for real-time updates
 *
 * Usage from client:
 * const eventSource = new EventSource('/api/events');
 * eventSource.addEventListener('new-block', (e) => {
 *   const data = JSON.parse(e.data);
 * });
 */
export async function GET(_request: NextRequest) {
  const clientId = randomBytes(16).toString('hex');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const welcomeMessage = `data: ${JSON.stringify({
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(welcomeMessage));

      // Add this client to broadcaster
      addListener(clientId, controller);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `: heartbeat ${Date.now()}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch (error) {
          console.error(`[SSE] Heartbeat failed for ${clientId}:`, error);
          clearInterval(heartbeatInterval);
          removeListener(clientId);
        }
      }, 30000);

      // Cleanup on close
      _request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        removeListener(clientId);
        try {
          controller.close();
        } catch (error) {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
