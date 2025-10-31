#!/usr/bin/env node

/**
 * Batch Translation Converter
 * Automatically converts components to use next-intl translations
 */

const fs = require('fs');
const path = require('path');

// Translation mapping - common hardcoded strings to translation keys
const translationMap = {
  // Common UI
  'Loading...': 'tCommon("loading")',
  Loading: 'tCommon("loading")',
  Error: 'tCommon("error")',
  Retry: 'tCommon("retry")',
  Refresh: 'tCommon("refresh")',
  Back: 'tCommon("back")',
  Next: 'tCommon("next")',
  Previous: 'tCommon("previous")',
  Details: 'tCommon("details")',
  View: 'tCommon("view")',
  Search: 'tCommon("search")',
  Filter: 'tCommon("filter")',
  Sort: 'tCommon("sort")',
  Copy: 'tCommon("copy")',
  Copied: 'tCommon("copied")',
  'Show More': 'tCommon("showMore")',
  'Show Less': 'tCommon("showLess")',
  Export: 'tCommon("export")',
  Download: 'tCommon("download")',

  // Time
  'Just now': 'tTime("justNow")',
  ago: 'tTime("ago")',
  Today: 'tTime("today")',
  Yesterday: 'tTime("yesterday")',

  // Dashboard
  Overview: 't("overview")',
  'Recent Blocks': 't("recentBlocks")',
  'Recent Transactions': 't("recentTransactions")',
  'Recent Activity': 't("recentActivity")',
  'Network Stats': 't("networkStats")',
  'All Blocks': 't("allBlocks")',
  'PoW Only': 't("powOnly")',
  'PoS Only': 't("posOnly")',

  // Blocks
  'Block Height': 'tBlocks("blockHeight")',
  'Total Blocks': 'tBlocks("totalBlocks")',
  Difficulty: 'tBlocks("difficulty")',
  Transactions: 'tBlocks("transactions")',
  'Block Time': 'tBlocks("blockTime")',
  Reward: 'tBlocks("reward")',
  Size: 'tBlocks("size")',
  Miner: 'tBlocks("miner")',
  Staker: 'tBlocks("staker")',

  // Network
  Connections: 'tNetwork("connections")',
  Hashrate: 'tNetwork("hashrate")',
  'Network Hash': 'tNetwork("networkHashrate")',
  'Mempool Size': 'tNetwork("mempoolSize")',
  'Circulating Supply': 'tNetwork("circulatingSupply")',

  // VerusID
  Identity: 'tVerusId("identity")',
  'Primary Addresses': 'tVerusId("primaryAddresses")',
};

// Determine which translation hooks are needed based on file content
function determineNeededHooks(content) {
  const hooks = new Set();

  // Check for common patterns
  if (
    content.match(
      /Loading|Error|Retry|Refresh|Back|Next|Search|Filter|Sort|Copy/i
    )
  ) {
    hooks.add('common');
  }
  if (content.match(/ago|Just now|Today|Yesterday/i)) {
    hooks.add('time');
  }
  if (
    content.match(
      /Overview|Recent Blocks|Recent Transactions|Network Stats|Dashboard/i
    )
  ) {
    hooks.add('dashboard');
  }
  if (
    content.match(
      /Block Height|Total Blocks|Difficulty|Transactions|Reward|Miner|Staker/i
    )
  ) {
    hooks.add('blocks');
  }
  if (content.match(/Connections|Hashrate|Network Hash|Mempool Size|Supply/i)) {
    hooks.add('network');
  }
  if (content.match(/VerusID|Identity|Primary Addresses/i)) {
    hooks.add('verusid');
  }
  if (content.match(/Staking|Stakes|Reward/i)) {
    hooks.add('staking');
  }

  return hooks;
}

// Generate hook declarations
function generateHooks(neededHooks) {
  const hookMap = {
    dashboard: "const t = useTranslations('dashboard');",
    common: "const tCommon = useTranslations('common');",
    time: "const tTime = useTranslations('time');",
    blocks: "const tBlocks = useTranslations('blocks');",
    network: "const tNetwork = useTranslations('network');",
    verusid: "const tVerusId = useTranslations('verusid');",
    staking: "const tStaking = useTranslations('staking');",
    transactions: "const tTransactions = useTranslations('transactions');",
    mempool: "const tMempool = useTranslations('mempool');",
  };

  return Array.from(neededHooks)
    .map(hook => hookMap[hook])
    .filter(Boolean)
    .join('\n  ');
}

// Add translation import if not present
function addTranslationImport(content) {
  if (content.includes('useTranslations')) {
    return content; // Already has import
  }

  // Find where to insert the import (after 'use client' and react imports)
  const lines = content.split('\n');
  let insertIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i].includes("'use client'") ||
      lines[i].includes('"use client"')
    ) {
      insertIndex = i + 1;
      // Skip blank lines after 'use client'
      while (insertIndex < lines.length && lines[insertIndex].trim() === '') {
        insertIndex++;
      }
      break;
    }
  }

  // Insert after first import block
  for (let i = insertIndex; i < lines.length; i++) {
    if (lines[i].startsWith('import') && !lines[i + 1]?.startsWith('import')) {
      insertIndex = i + 1;
      break;
    }
  }

  lines.splice(insertIndex, 0, "import { useTranslations } from 'next-intl';");
  return lines.join('\n');
}

// Add translation hooks to component
function addTranslationHooks(content, neededHooks) {
  if (neededHooks.size === 0) return content;

  const hooks = generateHooks(neededHooks);

  // Find the component function and add hooks after it
  const componentRegex = /export (function|const) \w+.*?\{/;
  const match = content.match(componentRegex);

  if (match) {
    const insertPos = match.index + match[0].length;
    const before = content.substring(0, insertPos);
    const after = content.substring(insertPos);

    // Check if hooks already exist
    if (after.substring(0, 200).includes('useTranslations')) {
      return content;
    }

    return before + '\n  ' + hooks + '\n' + after;
  }

  return content;
}

// Replace hardcoded strings with translation calls
function replaceStrings(content) {
  let modified = content;

  // Sort by length (longest first) to avoid partial replacements
  const entries = Object.entries(translationMap).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [original, replacement] of entries) {
    // Match string literals: 'text', "text", or {`text`}
    const patterns = [
      new RegExp(`'${escapeRegex(original)}'`, 'g'),
      new RegExp(`"${escapeRegex(original)}"`, 'g'),
      new RegExp(`>\s*${escapeRegex(original)}\s*<`, 'g'),
    ];

    for (const pattern of patterns) {
      if (pattern.toString().includes('>')) {
        // JSX text content
        modified = modified.replace(pattern, `>{${replacement}}<`);
      } else {
        // String literals
        modified = modified.replace(pattern, `{${replacement}}`);
      }
    }
  }

  return modified;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Process a single file
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Skip if already converted
    if (content.includes('useTranslations')) {
      console.log(
        `⏭️  Skipped (already converted): ${path.relative(process.cwd(), filePath)}`
      );
      return { converted: false, skipped: true };
    }

    // Skip if no 'use client' directive (server components)
    if (
      !content.includes("'use client'") &&
      !content.includes('"use client"')
    ) {
      console.log(
        `⏭️  Skipped (server component): ${path.relative(process.cwd(), filePath)}`
      );
      return { converted: false, skipped: true };
    }

    // Determine what hooks are needed
    const neededHooks = determineNeededHooks(content);

    if (neededHooks.size === 0) {
      console.log(
        `⏭️  Skipped (no translations needed): ${path.relative(process.cwd(), filePath)}`
      );
      return { converted: false, skipped: true };
    }

    // Step 1: Add import
    content = addTranslationImport(content);

    // Step 2: Add hooks
    content = addTranslationHooks(content, neededHooks);

    // Step 3: Replace strings
    content = replaceStrings(content);

    // Only write if changed
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Converted: ${path.relative(process.cwd(), filePath)}`);
      return { converted: true, skipped: false };
    } else {
      console.log(
        `⏭️  No changes needed: ${path.relative(process.cwd(), filePath)}`
      );
      return { converted: false, skipped: true };
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return { converted: false, skipped: false, error: true };
  }
}

// Find all .tsx files recursively
function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (!file.startsWith('.') && file !== 'node_modules') {
        findTsxFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') && !file.includes('.test.')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

// Main execution
function main() {
  console.log('🚀 Starting batch translation conversion...\n');

  const componentsDir = path.join(process.cwd(), 'components');
  const files = findTsxFiles(componentsDir);

  console.log(`Found ${files.length} .tsx files\n`);

  let converted = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const result = processFile(file);
    if (result.converted) converted++;
    if (result.skipped) skipped++;
    if (result.error) errors++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Conversion Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Converted: ${converted} files`);
  console.log(`⏭️  Skipped: ${skipped} files`);
  console.log(`❌ Errors: ${errors} files`);
  console.log(`📁 Total: ${files.length} files`);
  console.log('='.repeat(60));

  if (converted > 0) {
    console.log('\n✨ Conversion complete! Test your changes:');
    console.log('   npm run dev');
    console.log('   Visit: http://localhost:3000/es');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { processFile, findTsxFiles };
