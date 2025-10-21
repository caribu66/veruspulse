/**
 * Next.js Instrumentation File
 * Runs once when the server starts (before any requests)
 * Perfect for environment validation and initialization
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import and run startup validation
    const { validateStartup } = await import('./lib/config/startup-validation');

    try {
      validateStartup();
    } catch (error) {
      console.error('Failed to validate environment:', error);
      // Exit with error code in production
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }
}
