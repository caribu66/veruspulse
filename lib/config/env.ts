/**
 * Environment Variable Validation
 * Validates all required environment variables at startup
 * Provides type-safe access to environment configuration
 */

import { z } from 'zod';

// Validation schema for environment variables
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Verus RPC Configuration (Required)
  VERUS_RPC_HOST: z.string().url('VERUS_RPC_HOST must be a valid URL'),
  VERUS_RPC_USER: z.string().min(1, 'VERUS_RPC_USER is required'),
  VERUS_RPC_PASSWORD: z.string().min(8, 'VERUS_RPC_PASSWORD must be at least 8 characters'),
  VERUS_RPC_TIMEOUT: z.coerce.number().min(1000).default(10000),

  // ZMQ Configuration
  VERUS_ZMQ_ADDRESS: z.string().optional(),
  ENABLE_ZMQ: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  // Database Configuration (Optional - for UTXO tracking)
  DATABASE_URL: z.string().url().optional().or(z.literal('')),

  // Redis Configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().min(0).max(15).default(0),

  // Application Configuration
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Security Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(100),

  // Cache Configuration
  CACHE_TTL_BLOCKCHAIN: z.coerce.number().positive().default(30),
  CACHE_TTL_BLOCK: z.coerce.number().positive().default(300),
  CACHE_TTL_TRANSACTION: z.coerce.number().positive().default(120),
  CACHE_TTL_ADDRESS: z.coerce.number().positive().default(60),
  CACHE_TTL_MEMPOOL: z.coerce.number().positive().default(10),

  // Feature Flags
  ENABLE_CACHE: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  ENABLE_RATE_LIMITING: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  ENABLE_COMPRESSION: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  ENABLE_PERFORMANCE_MONITORING: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  ENABLE_HEALTH_CHECKS: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),

  // Logging Configuration
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FILE: z.string().optional(),

  // Sentry Configuration (Optional)
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional().or(z.literal('')),

  // Monitoring Configuration
  HEALTH_CHECK_INTERVAL: z.coerce.number().positive().default(60000),

  // UTXO Database (Optional)
  UTXO_DATABASE_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
});

// Type inference from schema
export type Env = z.infer<typeof envSchema>;

// Cached validated environment
let validatedEnv: Env | null = null;

/**
 * Validates and returns environment variables
 * Throws detailed error if validation fails
 * Caches result for performance
 */
export function getEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(process.env);
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `  ❌ ${err.path.join('.')}: ${err.message}`)
        .join('\n');

      console.error('╔════════════════════════════════════════════╗');
      console.error('║  ⚠️  ENVIRONMENT VALIDATION FAILED        ║');
      console.error('╚════════════════════════════════════════════╝');
      console.error('\nThe following environment variables are invalid:\n');
      console.error(errorMessages);
      console.error('\n💡 Solution:');
      console.error('  1. Copy env.example to .env');
      console.error('  2. Update the values with your configuration');
      console.error('  3. Restart the application\n');

      throw new Error('Environment validation failed. Please fix the errors above.');
    }
    throw error;
  }
}

/**
 * Type-safe environment variable access
 * Use this instead of process.env for validated config
 */
export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof Env];
  },
});

/**
 * Validates environment without throwing
 * Useful for health checks
 */
export function validateEnv(): { valid: boolean; errors?: string[] } {
  try {
    envSchema.parse(process.env);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return { valid: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Returns environment configuration summary
 * Safely logs configuration (hides sensitive values)
 */
export function getEnvSummary(): Record<string, string> {
  const env = getEnv();
  const sensitiveKeys = [
    'VERUS_RPC_PASSWORD',
    'JWT_SECRET',
    'REDIS_PASSWORD',
    'SENTRY_DSN',
    'NEXT_PUBLIC_SENTRY_DSN',
  ];

  return Object.entries(env).reduce((acc, [key, value]) => {
    if (sensitiveKeys.includes(key)) {
      acc[key] = value ? '***REDACTED***' : 'NOT_SET';
    } else {
      acc[key] = String(value);
    }
    return acc;
  }, {} as Record<string, string>);
}

