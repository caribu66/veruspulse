import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Capture unhandled promise rejections
  integrations: [
    // Using basic integrations for this version
  ],

  // Performance monitoring
  beforeSend(event, hint) {
    // Filter out certain errors in development
    if (process.env.NODE_ENV === 'development') {
      // Don't send network errors in development
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof TypeError && error.message.includes('fetch')) {
          return null;
        }
      }
    }

    return event;
  },

  // Add custom tags and context
  beforeSendTransaction(event) {
    // Add custom tags for better filtering
    event.tags = {
      ...event.tags,
      component: 'verus-explorer',
      environment: process.env.NODE_ENV,
    };

    return event;
  },

  // Environment-specific configuration
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development',

  // Custom error boundaries
  ignoreErrors: [
    // Ignore certain browser errors
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'Network request failed',
    'Loading chunk',
    'ChunkLoadError',
  ],
});
