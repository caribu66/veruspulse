import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export interface SecurityEvent {
  id: string;
  timestamp: number;
  type:
    | 'AUTH_FAILURE'
    | 'RATE_LIMIT_EXCEEDED'
    | 'SUSPICIOUS_REQUEST'
    | 'SQL_INJECTION_ATTEMPT'
    | 'XSS_ATTEMPT'
    | 'UNAUTHORIZED_ACCESS'
    | 'CSRF_VIOLATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ip: string;
  userAgent: string;
  path: string;
  method: string;
  details: Record<string, any>;
  blocked: boolean;
}

export interface SecurityMetrics {
  totalRequests: number;
  blockedRequests: number;
  authFailures: number;
  rateLimitHits: number;
  suspiciousActivities: number;
  lastUpdated: number;
}

/**
 * Security monitoring and alerting system
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private events: SecurityEvent[] = [];
  private metrics: SecurityMetrics = {
    totalRequests: 0,
    blockedRequests: 0,
    authFailures: 0,
    rateLimitHits: 0,
    suspiciousActivities: 0,
    lastUpdated: Date.now(),
  };
  private readonly maxEvents = 10000; // Keep last 10k events
  private readonly alertThresholds = {
    authFailures: 10, // Alert after 10 auth failures
    rateLimitHits: 50, // Alert after 50 rate limit hits
    suspiciousActivities: 5, // Alert after 5 suspicious activities
  };

  private constructor() {}

  public static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  /**
   * Log a security event
   */
  public logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
    };

    this.events.unshift(securityEvent);

    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Update metrics
    this.updateMetrics(securityEvent);

    // Log to application logger
    this.logToApplicationLogger(securityEvent);

    // Check for alerts
    this.checkAlerts(securityEvent);
  }

  /**
   * Get recent security events
   */
  public getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(0, limit);
  }

  /**
   * Get security metrics
   */
  public getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get events by type
   */
  public getEventsByType(
    type: SecurityEvent['type'],
    limit: number = 50
  ): SecurityEvent[] {
    return this.events.filter(event => event.type === type).slice(0, limit);
  }

  /**
   * Get events by IP
   */
  public getEventsByIP(ip: string, limit: number = 50): SecurityEvent[] {
    return this.events.filter(event => event.ip === ip).slice(0, limit);
  }

  /**
   * Check if an IP should be blocked
   */
  public shouldBlockIP(ip: string): boolean {
    const recentEvents = this.getEventsByIP(ip, 100);
    const criticalEvents = recentEvents.filter(
      event =>
        event.severity === 'CRITICAL' ||
        event.type === 'SQL_INJECTION_ATTEMPT' ||
        event.type === 'XSS_ATTEMPT'
    );

    // Block IP if more than 3 critical events in last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentCriticalEvents = criticalEvents.filter(
      event => event.timestamp > oneHourAgo
    );

    return recentCriticalEvents.length >= 3;
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update security metrics
   */
  private updateMetrics(event: SecurityEvent): void {
    this.metrics.totalRequests++;

    if (event.blocked) {
      this.metrics.blockedRequests++;
    }

    switch (event.type) {
      case 'AUTH_FAILURE':
        this.metrics.authFailures++;
        break;
      case 'RATE_LIMIT_EXCEEDED':
        this.metrics.rateLimitHits++;
        break;
      case 'SUSPICIOUS_REQUEST':
      case 'SQL_INJECTION_ATTEMPT':
      case 'XSS_ATTEMPT':
        this.metrics.suspiciousActivities++;
        break;
    }

    this.metrics.lastUpdated = Date.now();
  }

  /**
   * Log to application logger
   */
  private logToApplicationLogger(event: SecurityEvent): void {
    const logLevel = this.getLogLevel(event.severity);
    const message = `Security Event: ${event.type} - ${event.path} from ${event.ip}`;

    logger[logLevel](message, {
      eventId: event.id,
      type: event.type,
      severity: event.severity,
      ip: event.ip,
      path: event.path,
      method: event.method,
      blocked: event.blocked,
      details: event.details,
    });
  }

  /**
   * Check for security alerts
   */
  private checkAlerts(event: SecurityEvent): void {
    // Check auth failure threshold
    if (this.metrics.authFailures >= this.alertThresholds.authFailures) {
      this.sendAlert('HIGH_AUTH_FAILURES', {
        count: this.metrics.authFailures,
        threshold: this.alertThresholds.authFailures,
      });
    }

    // Check rate limit threshold
    if (this.metrics.rateLimitHits >= this.alertThresholds.rateLimitHits) {
      this.sendAlert('HIGH_RATE_LIMIT_HITS', {
        count: this.metrics.rateLimitHits,
        threshold: this.alertThresholds.rateLimitHits,
      });
    }

    // Check suspicious activity threshold
    if (
      this.metrics.suspiciousActivities >=
      this.alertThresholds.suspiciousActivities
    ) {
      this.sendAlert('HIGH_SUSPICIOUS_ACTIVITY', {
        count: this.metrics.suspiciousActivities,
        threshold: this.alertThresholds.suspiciousActivities,
      });
    }

    // Immediate alerts for critical events
    if (event.severity === 'CRITICAL') {
      this.sendAlert('CRITICAL_SECURITY_EVENT', {
        eventId: event.id,
        type: event.type,
        ip: event.ip,
        path: event.path,
        details: event.details,
      });
    }
  }

  /**
   * Send security alert
   */
  private sendAlert(alertType: string, data: any): void {
    logger.error(`SECURITY ALERT: ${alertType}`, data);

    // In production, you would send alerts to:
    // - Email notifications
    // - Slack/Discord webhooks
    // - Security monitoring systems
    // - Incident response teams
  }

  /**
   * Get appropriate log level for severity
   */
  private getLogLevel(
    severity: SecurityEvent['severity']
  ): 'info' | 'warn' | 'error' {
    switch (severity) {
      case 'LOW':
        return 'info';
      case 'MEDIUM':
        return 'warn';
      case 'HIGH':
      case 'CRITICAL':
        return 'error';
      default:
        return 'info';
    }
  }
}

/**
 * Security middleware that monitors requests
 */
export function securityMonitoringMiddleware(
  request: NextRequest
): NextResponse | null {
  const monitor = SecurityMonitor.getInstance();
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const path = request.nextUrl.pathname;
  const method = request.method;

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS attempts
    /union\s+select/i, // SQL injection
    /drop\s+table/i, // SQL injection
    /javascript:/i, // XSS attempts
    /on\w+\s*=/i, // Event handler injection
  ];

  const isSuspicious = suspiciousPatterns.some(
    pattern => pattern.test(path) || pattern.test(request.url)
  );

  if (isSuspicious) {
    monitor.logEvent({
      type: 'SUSPICIOUS_REQUEST',
      severity: 'HIGH',
      ip,
      userAgent,
      path,
      method,
      details: { url: request.url, suspiciousPattern: 'detected' },
      blocked: true,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Suspicious request detected',
        code: 'SUSPICIOUS_REQUEST',
      },
      { status: 400 }
    );
  }

  // Check if IP should be blocked
  if (monitor.shouldBlockIP(ip)) {
    monitor.logEvent({
      type: 'UNAUTHORIZED_ACCESS',
      severity: 'CRITICAL',
      ip,
      userAgent,
      path,
      method,
      details: { reason: 'IP_BLOCKED' },
      blocked: true,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Access denied',
        code: 'IP_BLOCKED',
      },
      { status: 403 }
    );
  }

  return null; // Allow request to proceed
}

/**
 * API endpoint for security monitoring dashboard
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const monitor = SecurityMonitor.getInstance();
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  switch (action) {
    case 'events':
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const events = monitor.getRecentEvents(limit);
      return NextResponse.json({ success: true, data: events });

    case 'metrics':
      const metrics = monitor.getMetrics();
      return NextResponse.json({ success: true, data: metrics });

    case 'events-by-type':
      const type = url.searchParams.get('type') as SecurityEvent['type'];
      const typeLimit = parseInt(url.searchParams.get('limit') || '50');
      const typeEvents = monitor.getEventsByType(type, typeLimit);
      return NextResponse.json({ success: true, data: typeEvents });

    case 'events-by-ip':
      const ip = url.searchParams.get('ip');
      const ipLimit = parseInt(url.searchParams.get('limit') || '50');
      const ipEvents = monitor.getEventsByIP(ip!, ipLimit);
      return NextResponse.json({ success: true, data: ipEvents });

    default:
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
  }
}
