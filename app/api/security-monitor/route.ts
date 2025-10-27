import { NextRequest, NextResponse } from 'next/server';
import {
  SecurityMonitor,
  securityMonitoringMiddleware,
} from '@/lib/security/security-monitor';
import { addSecurityHeaders } from '@/lib/middleware/security';

/**
 * Security monitoring API endpoint
 * Provides access to security events, metrics, and monitoring data
 */
export async function GET(request: NextRequest) {
  // Apply security monitoring middleware
  const securityCheck = securityMonitoringMiddleware(request);
  if (securityCheck) return securityCheck;

  try {
    const monitor = SecurityMonitor.getInstance();
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'events':
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const events = monitor.getRecentEvents(limit);
        const response = NextResponse.json({
          success: true,
          data: events,
          count: events.length,
        });
        return addSecurityHeaders(response);

      case 'metrics':
        const metrics = monitor.getMetrics();
        const metricsResponse = NextResponse.json({
          success: true,
          data: metrics,
        });
        return addSecurityHeaders(metricsResponse);

      case 'events-by-type':
        const type = url.searchParams.get('type') as any;
        if (!type) {
          return NextResponse.json(
            { success: false, error: 'Type parameter is required' },
            { status: 400 }
          );
        }
        const typeLimit = parseInt(url.searchParams.get('limit') || '50');
        const typeEvents = monitor.getEventsByType(type, typeLimit);
        const typeResponse = NextResponse.json({
          success: true,
          data: typeEvents,
          count: typeEvents.length,
        });
        return addSecurityHeaders(typeResponse);

      case 'events-by-ip':
        const ip = url.searchParams.get('ip');
        if (!ip) {
          return NextResponse.json(
            { success: false, error: 'IP parameter is required' },
            { status: 400 }
          );
        }
        const ipLimit = parseInt(url.searchParams.get('limit') || '50');
        const ipEvents = monitor.getEventsByIP(ip, ipLimit);
        const ipResponse = NextResponse.json({
          success: true,
          data: ipEvents,
          count: ipEvents.length,
        });
        return addSecurityHeaders(ipResponse);

      case 'blocked-ips':
        // Get all IPs that have been blocked
        const allEvents = monitor.getRecentEvents(1000);
        const blockedIPs = new Set(
          allEvents.filter(event => event.blocked).map(event => event.ip)
        );
        const blockedResponse = NextResponse.json({
          success: true,
          data: Array.from(blockedIPs),
          count: blockedIPs.size,
        });
        return addSecurityHeaders(blockedResponse);

      case 'summary':
        // Get security summary
        const summaryEvents = monitor.getRecentEvents(500);
        const summary = {
          totalEvents: summaryEvents.length,
          blockedEvents: summaryEvents.filter(e => e.blocked).length,
          criticalEvents: summaryEvents.filter(e => e.severity === 'CRITICAL')
            .length,
          highEvents: summaryEvents.filter(e => e.severity === 'HIGH').length,
          eventsByType: summaryEvents.reduce(
            (acc, event) => {
              acc[event.type] = (acc[event.type] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
          recentActivity: summaryEvents.slice(0, 10),
        };
        const summaryResponse = NextResponse.json({
          success: true,
          data: summary,
        });
        return addSecurityHeaders(summaryResponse);

      default:
        const helpResponse = NextResponse.json({
          success: true,
          message: 'Security Monitoring API',
          endpoints: {
            events: 'GET ?action=events&limit=100',
            metrics: 'GET ?action=metrics',
            'events-by-type': 'GET ?action=events-by-type&type=TYPE&limit=50',
            'events-by-ip': 'GET ?action=events-by-ip&ip=IP&limit=50',
            'blocked-ips': 'GET ?action=blocked-ips',
            summary: 'GET ?action=summary',
          },
          example: '/api/security-monitor?action=events&limit=10',
        });
        return addSecurityHeaders(helpResponse);
    }
  } catch (error) {
    console.error('Security monitor API error:', error);
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}

/**
 * POST endpoint for manual security event logging
 * (For testing or manual incident reporting)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const monitor = SecurityMonitor.getInstance();

    // Validate required fields
    const requiredFields = ['type', 'severity', 'ip', 'path', 'method'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Log the event
    monitor.logEvent({
      type: body.type,
      severity: body.severity,
      ip: body.ip,
      userAgent: body.userAgent || 'unknown',
      path: body.path,
      method: body.method,
      details: body.details || {},
      blocked: body.blocked || false,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Security event logged successfully',
      timestamp: Date.now(),
    });
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Security event logging error:', error);
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: 'Failed to log security event',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}
