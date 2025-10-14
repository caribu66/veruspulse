import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Server-side integrations
  integrations: [
    // Using basic integrations for this version
  ],

  // Performance monitoring for API routes
  beforeSend(event, hint) {
    // Add server context
    event.tags = {
      ...event.tags,
      component: 'verus-explorer-api',
      environment: process.env.NODE_ENV,
      server: true,
    };

    // Add request context if available
    if (event.request) {
      event.tags = {
        ...event.tags,
        method: event.request.method,
        url: event.request.url,
      };
    }

    // Filter out certain errors in development
    if (process.env.NODE_ENV === 'development') {
      // Don't send Redis connection errors in development
      if (event.exception) {
        const error = hint.originalException;
        if (
          error instanceof Error &&
          error.message.includes('Redis connection')
        ) {
          return null;
        }
      }
    }

    return event;
  },

  // Environment-specific configuration
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',

  // Custom error boundaries for server
  ignoreErrors: [
    // Ignore certain server errors
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'Redis connection failed',
  ],
});
