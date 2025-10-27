const { Pool } = require('pg');
const readline = require('readline');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

let previousStats = null;
let startTime = Date.now();

// Clear screen
process.stdout.write('\x1b[2J\x1b[0f');

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function printHeader() {
  console.log(
    '╔══════════════════════════════════════════════════════════════╗'
  );
  console.log('║          VERUS DATABASE GROWTH MONITOR - LIVE              ║');
  console.log(
    '╚══════════════════════════════════════════════════════════════╝'
  );
  console.log('');
}

function printSeparator() {
  console.log('──────────────────────────────────────────────────────────────');
}

async function getStats() {
  const result = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM staking_rewards WHERE identity_address LIKE 'i%') as total_stakes,
      (SELECT COUNT(DISTINCT identity_address) FROM staking_rewards WHERE identity_address LIKE 'i%') as unique_verusids,
      (SELECT COUNT(*) FROM staking_rewards WHERE identity_address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB') as caribu_stakes,
      (SELECT MAX(block_height) FROM staking_rewards) as latest_block,
      (SELECT MAX(block_time) FROM staking_rewards) as latest_time
  `);

  return result.rows[0];
}

function calculateRate(current, previous, timeDiff) {
  if (!previous) return 0;
  const diff = current - previous;
  const seconds = timeDiff / 1000;
  return seconds > 0 ? diff / seconds : 0;
}

async function update() {
  // Move cursor to top and clear screen
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);

  printHeader();

  const currentStats = await getStats();
  const currentTime = Date.now();
  const timeDiff = previousStats ? currentTime - previousStats.timestamp : 0;

  // Current stats
  console.log('📊 CURRENT STATUS');
  printSeparator();
  console.log(
    `  Total VerusID Stakes:     ${formatNumber(currentStats.total_stakes)}`
  );
  console.log(
    `  Unique VerusIDs:          ${formatNumber(currentStats.unique_verusids)}`
  );
  console.log(
    `  Caribu66@ Stakes:         ${formatNumber(currentStats.caribu_stakes)}`
  );
  console.log(
    `  Latest Block:             ${formatNumber(currentStats.latest_block)}`
  );
  console.log(`  Latest Time:              ${currentStats.latest_time}`);
  console.log('');

  // Growth rate
  if (previousStats) {
    const stakeRate = calculateRate(
      currentStats.total_stakes,
      previousStats.total_stakes,
      timeDiff
    );
    const caribuRate = calculateRate(
      currentStats.caribu_stakes,
      previousStats.caribu_stakes,
      timeDiff
    );
    const blockRate = calculateRate(
      parseInt(currentStats.latest_block),
      parseInt(previousStats.latest_block),
      timeDiff
    );

    console.log('⚡ GROWTH RATE (last update)');
    printSeparator();
    console.log(`  Stakes/sec:               ${stakeRate.toFixed(2)}`);
    console.log(`  Caribu66@ stakes/sec:     ${caribuRate.toFixed(3)}`);
    console.log(`  Blocks/sec:               ${blockRate.toFixed(2)}`);
    console.log('');

    // Changes
    console.log('📈 CHANGES');
    printSeparator();
    const stakeDiff = currentStats.total_stakes - previousStats.total_stakes;
    const caribuDiff = currentStats.caribu_stakes - previousStats.caribu_stakes;
    const blockDiff =
      parseInt(currentStats.latest_block) -
      parseInt(previousStats.latest_block);

    const stakeEmoji = stakeDiff > 0 ? '📈' : stakeDiff < 0 ? '📉' : '➡️';
    console.log(
      `  Stakes:                   ${stakeEmoji} ${stakeDiff > 0 ? '+' : ''}${stakeDiff}`
    );
    console.log(
      `  Caribu66@:                ${caribuDiff > 0 ? '+' : ''}${caribuDiff}`
    );
    console.log(`  Block height:             +${blockDiff}`);
    console.log('');
  }

  // Runtime
  const runtime = Date.now() - startTime;
  console.log('⏱️  RUNTIME');
  printSeparator();
  console.log(`  Monitoring for:           ${formatTime(runtime)}`);
  console.log(`  Update frequency:         Every 5 seconds`);
  console.log('');

  // Footer
  console.log('Press Ctrl+C to stop');
  console.log(
    '═══════════════════════════════════════════════════════════════'
  );

  previousStats = {
    ...currentStats,
    timestamp: currentTime,
  };
}

// Update every 5 seconds
setInterval(update, 5000);

// Initial update
update();

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping monitor...');
  pool.end();
  process.exit(0);
});
