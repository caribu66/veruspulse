import { createCipher, createDecipher, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Secure secrets management for VerusPulse
 * Handles encryption/decryption of sensitive configuration data
 */
export class SecretsManager {
  private static instance: SecretsManager;
  private encryptionKey: Buffer | null = null;
  private readonly algorithm = 'aes-256-gcm';

  private constructor() {}

  public static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }

  /**
   * Initialize the secrets manager with a master key
   */
  public async initialize(masterKey: string): Promise<void> {
    if (!masterKey || masterKey.length < 32) {
      throw new Error('Master key must be at least 32 characters long');
    }

    this.encryptionKey = (await scryptAsync(
      masterKey,
      'veruspulse-salt',
      32
    )) as Buffer;
  }

  /**
   * Encrypt sensitive data
   */
  public encrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new Error('SecretsManager not initialized');
    }

    const iv = randomBytes(16);
    const cipher = createCipher(this.algorithm, this.encryptionKey);
    cipher.setAAD(Buffer.from('veruspulse-auth', 'utf8'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  public decrypt(encryptedData: string): string {
    if (!this.encryptionKey) {
      throw new Error('SecretsManager not initialized');
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new Error('Invalid encrypted data format');
    }

    // IV extracted but not used directly - it's part of the encrypted data format
    // const _iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = createDecipher(this.algorithm, this.encryptionKey);
    decipher.setAAD(Buffer.from('veruspulse-auth', 'utf8'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate a secure random string
   */
  public generateSecureString(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Hash a password securely
   */
  public async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(32);
    const hash = (await scryptAsync(password, salt, 64)) as Buffer;
    return salt.toString('hex') + ':' + hash.toString('hex');
  }

  /**
   * Verify a password against its hash
   */
  public async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    const parts = hash.split(':');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return false;
    }

    const salt = Buffer.from(parts[0], 'hex');
    const storedHash = Buffer.from(parts[1], 'hex');
    const computedHash = (await scryptAsync(password, salt, 64)) as Buffer;

    return Buffer.compare(storedHash, computedHash) === 0;
  }
}

/**
 * Secure configuration loader
 */
export class SecureConfig {
  private secretsManager: SecretsManager;
  private config: Map<string, string> = new Map();

  constructor() {
    this.secretsManager = SecretsManager.getInstance();
  }

  /**
   * Load encrypted configuration from environment
   */
  public async loadSecureConfig(): Promise<void> {
    const masterKey = process.env.SECRETS_MASTER_KEY;
    if (!masterKey) {
      throw new Error('SECRETS_MASTER_KEY environment variable is required');
    }

    await this.secretsManager.initialize(masterKey);

    // Load encrypted secrets
    const encryptedSecrets = [
      'VERUS_RPC_PASSWORD',
      'DATABASE_PASSWORD',
      'REDIS_PASSWORD',
      'JWT_SECRET',
      'CSRF_SECRET',
      'SESSION_SECRET',
    ];

    for (const secretName of encryptedSecrets) {
      const encryptedValue = process.env[`${secretName}_ENCRYPTED`];
      if (encryptedValue) {
        try {
          const decryptedValue = this.secretsManager.decrypt(encryptedValue);
          this.config.set(secretName, decryptedValue);
        } catch (error) {
          console.error(`Failed to decrypt ${secretName}:`, error);
          throw new Error(`Invalid encrypted secret: ${secretName}`);
        }
      }
    }
  }

  /**
   * Get a secure configuration value
   */
  public getSecureValue(key: string): string | undefined {
    return this.config.get(key) || process.env[key];
  }

  /**
   * Check if a secure value exists
   */
  public hasSecureValue(key: string): boolean {
    return this.config.has(key) || !!process.env[key];
  }
}

/**
 * Generate secure secrets for production
 */
export function generateProductionSecrets(): {
  verusRpcPassword: string;
  databasePassword: string;
  redisPassword: string;
  jwtSecret: string;
  csrfSecret: string;
  sessionSecret: string;
  masterKey: string;
} {
  const secretsManager = SecretsManager.getInstance();

  return {
    verusRpcPassword: secretsManager.generateSecureString(64),
    databasePassword: secretsManager.generateSecureString(32),
    redisPassword: secretsManager.generateSecureString(32),
    jwtSecret: secretsManager.generateSecureString(128),
    csrfSecret: secretsManager.generateSecureString(64),
    sessionSecret: secretsManager.generateSecureString(64),
    masterKey: secretsManager.generateSecureString(128),
  };
}

/**
 * Encrypt secrets for environment variables
 */
export async function encryptSecretsForEnv(
  secrets: ReturnType<typeof generateProductionSecrets>
): Promise<{
  SECRETS_MASTER_KEY: string;
  VERUS_RPC_PASSWORD_ENCRYPTED: string;
  DATABASE_PASSWORD_ENCRYPTED: string;
  REDIS_PASSWORD_ENCRYPTED: string;
  JWT_SECRET_ENCRYPTED: string;
  CSRF_SECRET_ENCRYPTED: string;
  SESSION_SECRET_ENCRYPTED: string;
}> {
  const secretsManager = SecretsManager.getInstance();
  await secretsManager.initialize(secrets.masterKey);

  return {
    SECRETS_MASTER_KEY: secrets.masterKey,
    VERUS_RPC_PASSWORD_ENCRYPTED: secretsManager.encrypt(
      secrets.verusRpcPassword
    ),
    DATABASE_PASSWORD_ENCRYPTED: secretsManager.encrypt(
      secrets.databasePassword
    ),
    REDIS_PASSWORD_ENCRYPTED: secretsManager.encrypt(secrets.redisPassword),
    JWT_SECRET_ENCRYPTED: secretsManager.encrypt(secrets.jwtSecret),
    CSRF_SECRET_ENCRYPTED: secretsManager.encrypt(secrets.csrfSecret),
    SESSION_SECRET_ENCRYPTED: secretsManager.encrypt(secrets.sessionSecret),
  };
}
