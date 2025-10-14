#!/usr/bin/env node

/**
 * Remote Verus Daemon Process Monitor
 * Monitors the remote daemon's process information and system resources
 */

const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  daemonHost: process.env.VERUS_RPC_HOST || 'http://192.168.86.89:18843',
  rpcUser: process.env.VERUS_RPC_USER || 'verus',
  rpcPassword: process.env.VERUS_RPC_PASSWORD || 'verus',
  monitorInterval: 30000, // 30 seconds
  logFile: path.join(__dirname, '../logs/daemon-monitor.log'),
  statsFile: path.join(__dirname, '../data/daemon-stats.json'),
};

// Ensure logs directory exists
const logsDir = path.dirname(config.logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Ensure data directory exists
const dataDir = path.dirname(config.statsFile);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

class DaemonMonitor {
  constructor() {
    this.stats = {
      lastUpdate: null,
      blockchain: null,
      network: null,
      mining: null,
      mempool: null,
      system: null,
      errors: [],
    };
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);

    // Write to log file
    fs.appendFileSync(config.logFile, logMessage + '\n');
  }

  async makeRPCRequest(method, params = []) {
    return new Promise((resolve, reject) => {
      const url = new URL(config.daemonHost);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            'Basic ' +
            Buffer.from(`${config.rpcUser}:${config.rpcPassword}`).toString(
              'base64'
            ),
        },
        timeout: 10000,
      };

      const rpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      };

      const req = client.request(options, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(new Error(`RPC Error: ${response.error.message}`));
            } else {
              resolve(response.result);
            }
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.setTimeout(10000);

      req.write(JSON.stringify(rpcRequest));
      req.end();
    });
  }

  async getBlockchainInfo() {
    try {
      const info = await this.makeRPCRequest('getblockchaininfo');
      return {
        chain: info.chain,
        blocks: info.blocks,
        headers: info.headers,
        difficulty: info.difficulty,
        verificationProgress: info.verificationprogress,
        sizeOnDisk: info.size_on_disk,
        pruned: info.pruned,
        commitments: info.commitments,
        chainwork: info.chainwork,
        chainstake: info.chainstake,
      };
    } catch (error) {
      this.log(`Failed to get blockchain info: ${error.message}`, 'ERROR');
      return null;
    }
  }

  async getNetworkInfo() {
    try {
      const info = await this.makeRPCRequest('getnetworkinfo');
      return {
        version: info.version,
        subversion: info.subversion,
        protocolVersion: info.protocolversion,
        connections: info.connections,
        networkActive: info.networkactive,
        localServices: info.localservices,
        relayFee: info.relayfee,
        incrementalfee: info.incrementalfee,
      };
    } catch (error) {
      this.log(`Failed to get network info: ${error.message}`, 'ERROR');
      return null;
    }
  }

  async getMiningInfo() {
    try {
      const info = await this.makeRPCRequest('getmininginfo');
      return {
        blocks: info.blocks,
        currentBlockSize: info.currentblocksize,
        currentBlockTx: info.currentblocktx,
        difficulty: info.difficulty,
        networkHashPS: info.networkhashps,
        pooledTx: info.pooledtx,
        chain: info.chain,
        warnings: info.warnings,
      };
    } catch (error) {
      this.log(`Failed to get mining info: ${error.message}`, 'ERROR');
      return null;
    }
  }

  async getMempoolInfo() {
    try {
      const info = await this.makeRPCRequest('getmempoolinfo');
      return {
        size: info.size,
        bytes: info.bytes,
        usage: info.usage,
        maxMempool: info.maxmempool,
        mempoolMinFee: info.mempoolminfee,
        minRelayTxFee: info.minrelaytxfee,
      };
    } catch (error) {
      this.log(`Failed to get mempool info: ${error.message}`, 'ERROR');
      return null;
    }
  }

  async getSystemInfo() {
    try {
      // Get system information from the remote daemon
      const uptime = await this.makeRPCRequest('uptime');
      const memoryInfo = await this.makeRPCRequest('getmemoryinfo');

      return {
        uptime,
        memoryInfo,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.log(`Failed to get system info: ${error.message}`, 'ERROR');
      return null;
    }
  }

  calculateSyncProgress(blockchain) {
    if (!blockchain) return null;

    const progress = blockchain.verificationProgress * 100;
    const blocksBehind = blockchain.headers - blockchain.blocks;
    const estimatedTimeRemaining =
      blocksBehind > 0 ? (blocksBehind * 2.5) / 60 : 0; // Assuming 2.5 minutes per block average

    return {
      percentage: progress,
      blocksBehind,
      estimatedTimeRemaining: estimatedTimeRemaining,
      isSyncing: progress < 99.9,
    };
  }

  calculateNetworkHealth(network) {
    if (!network) return null;

    return {
      connections: network.connections,
      isHealthy: network.connections >= 8,
      status:
        network.connections >= 8
          ? 'healthy'
          : network.connections >= 4
            ? 'degraded'
            : 'unhealthy',
    };
  }

  calculateMempoolHealth(mempool) {
    if (!mempool) return null;

    const usagePercent = (mempool.usage / mempool.maxMempool) * 100;

    return {
      size: mempool.size,
      usagePercent,
      isHealthy: usagePercent < 80,
      status:
        usagePercent < 80
          ? 'healthy'
          : usagePercent < 95
            ? 'degraded'
            : 'unhealthy',
    };
  }

  async collectStats() {
    this.log('Collecting daemon statistics...');

    const startTime = Date.now();

    try {
      // Collect all data in parallel
      const [blockchain, network, mining, mempool, system] =
        await Promise.allSettled([
          this.getBlockchainInfo(),
          this.getNetworkInfo(),
          this.getMiningInfo(),
          this.getMempoolInfo(),
          this.getSystemInfo(),
        ]);

      // Process results
      this.stats.blockchain =
        blockchain.status === 'fulfilled' ? blockchain.value : null;
      this.stats.network =
        network.status === 'fulfilled' ? network.value : null;
      this.stats.mining = mining.status === 'fulfilled' ? mining.value : null;
      this.stats.mempool =
        mempool.status === 'fulfilled' ? mempool.value : null;
      this.stats.system = system.status === 'fulfilled' ? system.value : null;
      this.stats.lastUpdate = Date.now();
      this.stats.collectionTime = Date.now() - startTime;

      // Calculate derived metrics
      this.stats.syncProgress = this.calculateSyncProgress(
        this.stats.blockchain
      );
      this.stats.networkHealth = this.calculateNetworkHealth(
        this.stats.network
      );
      this.stats.mempoolHealth = this.calculateMempoolHealth(
        this.stats.mempool
      );

      // Save stats to file
      this.saveStats();

      // Log summary
      this.logSummary();
    } catch (error) {
      this.log(`Failed to collect stats: ${error.message}`, 'ERROR');
      this.stats.errors.push({
        timestamp: Date.now(),
        error: error.message,
      });
    }
  }

  logSummary() {
    if (!this.stats.blockchain) {
      this.log('❌ No blockchain data available', 'ERROR');
      return;
    }

    const sync = this.stats.syncProgress;
    const network = this.stats.networkHealth;
    const mempool = this.stats.mempoolHealth;

    this.log('📊 Daemon Status Summary:');
    this.log(`   🔗 Chain: ${this.stats.blockchain.chain}`);
    this.log(`   📦 Blocks: ${this.stats.blockchain.blocks.toLocaleString()}`);
    this.log(
      `   📈 Headers: ${this.stats.blockchain.headers.toLocaleString()}`
    );
    this.log(
      `   ⚡ Difficulty: ${this.stats.blockchain.difficulty.toExponential(2)}`
    );

    if (sync) {
      this.log(`   🔄 Sync Progress: ${sync.percentage.toFixed(2)}%`);
      if (sync.isSyncing) {
        this.log(`   ⏳ Blocks Behind: ${sync.blocksBehind.toLocaleString()}`);
        this.log(
          `   ⏱️  Est. Time Remaining: ${sync.estimatedTimeRemaining.toFixed(1)} minutes`
        );
      } else {
        this.log(`   ✅ Fully Synced!`);
      }
    }

    if (network) {
      this.log(`   🌐 Connections: ${network.connections} (${network.status})`);
    }

    if (mempool) {
      this.log(
        `   💾 Mempool: ${mempool.size} transactions (${mempool.usagePercent.toFixed(1)}% usage)`
      );
    }

    this.log(`   ⏱️  Collection Time: ${this.stats.collectionTime}ms`);
  }

  saveStats() {
    try {
      fs.writeFileSync(config.statsFile, JSON.stringify(this.stats, null, 2));
    } catch (error) {
      this.log(`Failed to save stats: ${error.message}`, 'ERROR');
    }
  }

  loadStats() {
    try {
      if (fs.existsSync(config.statsFile)) {
        const data = fs.readFileSync(config.statsFile, 'utf8');
        this.stats = { ...this.stats, ...JSON.parse(data) };
      }
    } catch (error) {
      this.log(`Failed to load stats: ${error.message}`, 'ERROR');
    }
  }

  start() {
    this.log('🚀 Starting Remote Verus Daemon Monitor');
    this.log(`📡 Monitoring: ${config.daemonHost}`);
    this.log(`⏱️  Interval: ${config.monitorInterval / 1000} seconds`);

    // Load previous stats
    this.loadStats();

    // Initial collection
    this.collectStats();

    // Set up interval
    setInterval(() => {
      this.collectStats();
    }, config.monitorInterval);
  }

  // Method to get current stats (for API access)
  getStats() {
    return this.stats;
  }
}

// CLI usage
if (require.main === module) {
  const monitor = new DaemonMonitor();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down daemon monitor...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down daemon monitor...');
    process.exit(0);
  });

  monitor.start();
}

module.exports = DaemonMonitor;
