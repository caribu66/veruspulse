import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Edge runtime integrations
  integrations: [
    // Using basic integrations for this version
  ],

  // Performance monitoring for edge functions
  beforeSend(event, hint) {
    // Add edge context
    event.tags = {
      ...event.tags,
      component: 'verus-explorer-edge',
      environment: process.env.NODE_ENV,
      edge: true,
    };

    return event;
  },

  // Environment-specific configuration
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
});
