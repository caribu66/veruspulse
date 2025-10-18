// Use performance API that works in both Node.js and Edge Runtime
const performance =
  typeof globalThis !== 'undefined' && globalThis.performance
    ? globalThis.performance
    : Date;

// Simple color functions without chalk dependency
const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
};

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'DEBUG';
  category:
    | 'API'
    | 'RPC'
    | 'DATABASE'
    | 'REQUEST'
    | 'SYSTEM'
    | 'CACHE'
    | 'STAKE';
  message: string;
  details?: any;
  duration?: number;
  status?: number;
  method?: string;
  endpoint?: string;
  address?: string;
  error?: Error;
}

class EnhancedLogger {
  private startTimes: Map<string, number> = new Map();
  private requestCount = 0;
  private errorCount = 0;
  private successCount = 0;
  private bannerShown = false;

  constructor() {
    this.showStartupBanner();
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 23);
  }

  private getEmoji(
    level: LogEntry['level'],
    category: LogEntry['category']
  ): string {
    const emojiMap = {
      INFO: {
        API: '🔍',
        RPC: '🔗',
        DATABASE: '🗄️',
        REQUEST: '📡',
        SYSTEM: '⚙️',
        CACHE: '💾',
        STAKE: '💰',
      },
      WARN: {
        API: '⚠️',
        RPC: '⚠️',
        DATABASE: '⚠️',
        REQUEST: '⚠️',
        SYSTEM: '⚠️',
        CACHE: '⚠️',
        STAKE: '⚠️',
      },
      ERROR: {
        API: '❌',
        RPC: '❌',
        DATABASE: '❌',
        REQUEST: '❌',
        SYSTEM: '❌',
        CACHE: '❌',
        STAKE: '❌',
      },
      SUCCESS: {
        API: '✅',
        RPC: '✅',
        DATABASE: '✅',
        REQUEST: '✅',
        SYSTEM: '✅',
        CACHE: '✅',
        STAKE: '✅',
      },
      DEBUG: {
        API: '🔧',
        RPC: '🔧',
        DATABASE: '🔧',
        REQUEST: '🔧',
        SYSTEM: '🔧',
        CACHE: '🔧',
        STAKE: '🔧',
      },
    };
    return emojiMap[level][category] || '📝';
  }

  private getColor(level: LogEntry['level']): (text: string) => string {
    switch (level) {
      case 'ERROR':
        return colors.red;
      case 'WARN':
        return colors.yellow;
      case 'SUCCESS':
        return colors.green;
      case 'DEBUG':
        return colors.gray;
      default:
        return colors.cyan;
    }
  }

  private formatDuration(duration: number): string {
    if (duration < 1000) {
      return colors.green(`${duration.toFixed(0)}ms`);
    } else if (duration < 5000) {
      return colors.yellow(`${(duration / 1000).toFixed(1)}s`);
    } else {
      return colors.red(`${(duration / 1000).toFixed(1)}s`);
    }
  }

  private formatStatus(status: number): string {
    if (status >= 200 && status < 300) {
      return colors.green(status.toString());
    } else if (status >= 400 && status < 500) {
      return colors.yellow(status.toString());
    } else if (status >= 500) {
      return colors.red(status.toString());
    }
    return colors.gray(status.toString());
  }

  private log(entry: LogEntry): void {
    const emoji = this.getEmoji(entry.level, entry.category);
    const color = this.getColor(entry.level);
    const timestamp = colors.gray(`[${entry.timestamp}]`);

    let mainMessage = `${emoji} ${color(`[${entry.level}]`)} ${entry.message}`;

    // Add method and endpoint info for API calls
    if (entry.method && entry.endpoint) {
      mainMessage += colors.blue(` ${entry.method} ${entry.endpoint}`);
    }

    // Add status code
    if (entry.status) {
      mainMessage += ` ${this.formatStatus(entry.status)}`;
    }

    // Add duration
    if (entry.duration) {
      mainMessage += ` ${this.formatDuration(entry.duration)}`;
    }

    // Add address info for stake-related logs
    if (entry.address) {
      mainMessage += colors.magenta(` [${entry.address.substring(0, 8)}...]`);
    }

    console.log(`${timestamp} ${mainMessage}`);

    // Log details if present
    if (entry.details) {
      console.log(
        colors.gray(`    Details: ${JSON.stringify(entry.details, null, 2)}`)
      );
    }

    // Log error stack if present
    if (entry.error) {
      console.log(colors.red(`    Error: ${entry.error.message}`));
      if (entry.level === 'DEBUG') {
        console.log(colors.gray(entry.error.stack || ''));
      }
    }

    // Update counters
    if (entry.level === 'ERROR') {
      this.errorCount++;
    } else if (entry.level === 'SUCCESS') {
      this.successCount++;
    }
    if (entry.category === 'REQUEST') {
      this.requestCount++;
    }

    // Show stats every 10 requests
    if (this.requestCount % 10 === 0 && this.requestCount > 0) {
      this.showStats();
    }
  }

  public startTimer(id: string): void {
    const now =
      typeof performance.now === 'function' ? performance.now() : Date.now();
    this.startTimes.set(id, now);
  }

  public endTimer(id: string): number {
    const startTime = this.startTimes.get(id);
    if (startTime) {
      const now =
        typeof performance.now === 'function' ? performance.now() : Date.now();
      const duration = now - startTime;
      this.startTimes.delete(id);
      return duration;
    }
    return 0;
  }

  public info(
    category: LogEntry['category'],
    message: string,
    details?: any
  ): void {
    this.log({
      timestamp: this.formatTimestamp(),
      level: 'INFO',
      category,
      message,
      details,
    });
  }

  public warn(
    category: LogEntry['category'],
    message: string,
    details?: any
  ): void {
    this.log({
      timestamp: this.formatTimestamp(),
      level: 'WARN',
      category,
      message,
      details,
    });
  }

  public error(
    category: LogEntry['category'],
    message: string,
    error?: Error,
    details?: any
  ): void {
    this.log({
      timestamp: this.formatTimestamp(),
      level: 'ERROR',
      category,
      message,
      error,
      details,
    });
  }

  public success(
    category: LogEntry['category'],
    message: string,
    details?: any
  ): void {
    this.log({
      timestamp: this.formatTimestamp(),
      level: 'SUCCESS',
      category,
      message,
      details,
    });
  }

  public debug(
    category: LogEntry['category'],
    message: string,
    details?: any
  ): void {
    if (process.env.NODE_ENV === 'development') {
      this.log({
        timestamp: this.formatTimestamp(),
        level: 'DEBUG',
        category,
        message,
        details,
      });
    }
  }

  public apiCall(
    method: string,
    endpoint: string,
    status?: number,
    duration?: number,
    details?: any
  ): void {
    const level =
      status && status >= 400
        ? 'ERROR'
        : status && status >= 200 && status < 300
          ? 'SUCCESS'
          : 'INFO';
    this.log({
      timestamp: this.formatTimestamp(),
      level,
      category: 'API',
      message: `API Call`,
      method,
      endpoint,
      status,
      duration,
      details,
    });
  }

  public rpcCall(
    method: string,
    status: 'success' | 'error' | 'retry',
    duration?: number,
    details?: any
  ): void {
    const level =
      status === 'error' ? 'ERROR' : status === 'success' ? 'SUCCESS' : 'WARN';
    this.log({
      timestamp: this.formatTimestamp(),
      level,
      category: 'RPC',
      message: `RPC ${method}`,
      details: { status, ...details },
      duration,
    });
  }

  public stakeReward(
    address: string,
    reward: number,
    txid: string,
    blockHeight: number
  ): void {
    this.log({
      timestamp: this.formatTimestamp(),
      level: 'SUCCESS',
      category: 'STAKE',
      message: `Found staking reward`,
      address,
      details: {
        reward: `${reward.toFixed(8)} VRSC`,
        txid: txid.substring(0, 16) + '...',
        blockHeight,
      },
    });
  }

  public databaseQuery(
    operation: string,
    duration?: number,
    error?: Error
  ): void {
    const level = error ? 'ERROR' : 'SUCCESS';
    this.log({
      timestamp: this.formatTimestamp(),
      level,
      category: 'DATABASE',
      message: `Database ${operation}`,
      error,
      duration,
    });
  }

  public request(
    method: string,
    url: string,
    status?: number,
    duration?: number,
    details?: any
  ): void {
    const level = status && status >= 400 ? 'ERROR' : 'SUCCESS';
    this.log({
      timestamp: this.formatTimestamp(),
      level,
      category: 'REQUEST',
      message: `Request`,
      method,
      endpoint: url,
      status,
      duration,
      details,
    });
  }

  public showStats(): void {
    console.log(colors.blue('\n📊 === SYSTEM STATS ==='));
    console.log(colors.green(`✅ Successful requests: ${this.successCount}`));
    console.log(colors.red(`❌ Errors: ${this.errorCount}`));
    console.log(colors.cyan(`📡 Total requests: ${this.requestCount}`));
    console.log(colors.gray(`⏱️  Active timers: ${this.startTimes.size}`));
    console.log(colors.blue('========================\n'));
  }

  public clearStats(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.successCount = 0;
  }

  private showStartupBanner(): void {
    if (this.bannerShown || process.env.NODE_ENV !== 'development') return;

    console.log('\n');
    console.log('🚀 ========================================');
    console.log('   VERUS EXPLORER - ENHANCED LOGGING');
    console.log('========================================');
    console.log('📊 Real-time monitoring active');
    console.log('🔍 API calls tracked');
    console.log('💰 Staking rewards monitored');
    console.log('🔗 RPC calls logged');
    console.log('⚠️  Errors highlighted');
    console.log('📈 Performance metrics enabled');
    console.log('========================================');
    console.log('🎯 Watch this console for detailed activity');
    console.log('========================================\n');

    this.bannerShown = true;
  }
}

export const enhancedLogger = new EnhancedLogger();
