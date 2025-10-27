const fs = require('fs');
const { execSync } = require('child_process');

function getScanProgress() {
  // Read the log file
  const logFile = 'year-scan-remaining.log';

  if (!fs.existsSync(logFile)) {
    console.log('❌ Scanner log file not found');
    return;
  }

  const log = fs.readFileSync(logFile, 'utf8');
  const lines = log.split('\n');

  // Find latest progress update
  let latestProgress = {};
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('Progress:')) {
      const parts = lines[i].match(/Progress: ([\d.]+)% \(Block ([\d,]+)\)/);
      if (parts) {
        latestProgress.percentage = parseFloat(parts[1]);
        latestProgress.block = parseInt(parts[2].replace(/,/g, ''));
      }

      // Get additional info from nearby lines
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes('Stakes found:')) {
          const stakeMatch = lines[j].match(/Stakes found: ([\d,]+)/);
          if (stakeMatch) latestProgress.stakes = stakeMatch[1];
        }
        if (lines[j].includes('Speed:')) {
          const speedMatch = lines[j].match(/Speed: ([\d.]+) blocks\/sec/);
          if (speedMatch) latestProgress.speed = speedMatch[1];
        }
        if (lines[j].includes('ETA:')) {
          const etaMatch = lines[j].match(/ETA: ([\d.]+) minutes/);
          if (etaMatch) latestProgress.eta = etaMatch[1];
        }
        if (lines[j].includes('PoS blocks:')) {
          const posMatch = lines[j].match(/PoS blocks: ([\d,]+)/);
          if (posMatch) latestProgress.posBlocks = posMatch[1];
        }
      }
      break;
    }
  }

  // Get start and end blocks from log
  const startMatch = log.match(/Scanning range: ([\d,]+) to ([\d,]+)/);
  const endMatch = log.match(/Total blocks: ([\d,]+)/);

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           VERUSID STAKING SCANNER DASHBOARD              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  if (startMatch) {
    console.log(
      `📊 Scanning Range: Block ${startMatch[1]} to ${startMatch[2]}`
    );
    console.log(
      `📊 Total Blocks: ${endMatch ? endMatch[1] : 'Calculating...'}`
    );
    console.log('');
  }

  if (latestProgress.block) {
    const progressBar =
      '█'.repeat(Math.floor(latestProgress.percentage / 2)) +
      '░'.repeat(50 - Math.floor(latestProgress.percentage / 2));

    console.log(
      `Progress: [${progressBar}] ${latestProgress.percentage.toFixed(2)}%`
    );
    console.log(`Current Block: ${latestProgress.block.toLocaleString()}`);
    console.log('');

    if (latestProgress.posBlocks) {
      console.log(`🎯 PoS Blocks Found: ${latestProgress.posBlocks}`);
    }
    if (latestProgress.stakes) {
      console.log(`💰 Stakes Found: ${latestProgress.stakes}`);
    }
    if (latestProgress.speed) {
      console.log(`⚡ Speed: ${latestProgress.speed} blocks/sec`);
    }
    if (latestProgress.eta) {
      const etaHours = Math.floor(latestProgress.eta / 60);
      const etaMins = Math.floor(latestProgress.eta % 60);
      console.log(`⏱️  ETA: ${etaHours}h ${etaMins}m`);
    }
  }

  console.log('');

  // Get recent VerusID stake findings
  const recentStakes = [];
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 50); i--) {
    if (lines[i].includes('💰') && lines[i].includes('VRSC')) {
      recentStakes.unshift(lines[i].trim());
      if (recentStakes.length >= 5) break;
    }
  }

  if (recentStakes.length > 0) {
    console.log('🔍 Recent VerusID Stakes Found:');
    recentStakes.forEach(stake => console.log(`   ${stake}`));
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');

  // Get current block date
  try {
    const hash = execSync(
      `/home/explorer/verus-cli/verus getblockhash ${latestProgress.block}`,
      { encoding: 'utf8' }
    ).trim();
    const block = JSON.parse(
      execSync(`/home/explorer/verus-cli/verus getblock ${hash} 2`, {
        encoding: 'utf8',
      })
    );
    const date = new Date(block.time * 1000);
    console.log(
      `📅 Current Time Period: ${date.toISOString().split('T')[0]} ${date.toISOString().split('T')[1].substring(0, 5)} UTC`
    );
  } catch (error) {
    // Skip if can't get block
  }

  console.log('');
}

getScanProgress();
