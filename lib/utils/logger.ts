// Enhanced logger that provides detailed console output
import { enhancedLogger } from './enhanced-logger';

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  info(message: string, data?: any): void {
    if (this.isDevelopment) {
      enhancedLogger.info('SYSTEM', message, data);
    }
  }

  warn(message: string, data?: any): void {
    if (this.isDevelopment) {
      enhancedLogger.warn('SYSTEM', message, data);
    }
  }

  error(message: string, data?: any): void {
    enhancedLogger.error('SYSTEM', message, undefined, data);
  }

  debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      enhancedLogger.debug('SYSTEM', message, data);
    }
  }
}

export const logger = new Logger();
