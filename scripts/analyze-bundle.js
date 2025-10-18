#!/usr/bin/env node

/**
 * Bundle Size Analyzer
 * Helps identify large dependencies and optimization opportunities
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing bundle size...\n');

// Check if .next directory exists
const nextDir = path.join(process.cwd(), '.next');
if (!fs.existsSync(nextDir)) {
  console.log('❌ No build found. Run "npm run build" first.');
  process.exit(1);
}

// Read build manifest
try {
  const buildManifest = path.join(nextDir, 'build-manifest.json');
  if (fs.existsSync(buildManifest)) {
    const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));

    console.log('📦 Bundle Analysis:\n');
    console.log('Pages and their chunks:');

    Object.entries(manifest.pages).forEach(([page, chunks]) => {
      console.log(`\n  ${page}:`);
      if (Array.isArray(chunks)) {
        chunks.forEach(chunk => {
          const chunkPath = path.join(nextDir, 'static', 'chunks', chunk);
          if (fs.existsSync(chunkPath)) {
            const stats = fs.statSync(chunkPath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            console.log(`    - ${chunk} (${sizeKB} KB)`);
          }
        });
      }
    });
  }

  console.log('\n✅ Analysis complete!');
  console.log('\n💡 Optimization tips:');
  console.log('  - Use dynamic imports for large components');
  console.log('  - Enable tree shaking');
  console.log('  - Minimize third-party dependencies');
  console.log('  - Use Next.js Image optimization');
  console.log('  - Enable compression (gzip/brotli)');
} catch (error) {
  console.error('Error analyzing bundle:', error.message);
  process.exit(1);
}
