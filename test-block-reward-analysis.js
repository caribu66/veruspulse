#!/usr/bin/env node

/**
 * Test script to analyze Verus block rewards dynamically
 * This will sample blocks across the blockchain to determine the actual reward schedule
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testBlockRewardAnalysis() {
  console.log('🔍 Testing Dynamic Block Reward Analysis');
  console.log('==========================================');
  console.log('');

  try {
    console.log('📊 Triggering block reward analysis...');
    console.log(
      'This may take a few minutes as we analyze blocks across the blockchain...'
    );
    console.log('');

    const response = await fetch(`${BASE_URL}/api/analyze-block-rewards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sampleSize: 50, // Start with fewer samples for testing
        forceRefresh: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ Analysis Complete!');
      console.log('');
      console.log(`📈 Found ${result.data.totalPeriods} reward periods:`);
      console.log('');

      result.data.periods.forEach((period, index) => {
        const status = period.isCurrent ? ' (CURRENT)' : '';
        console.log(`Period ${index + 1}:`);
        console.log(
          `  Blocks: ${period.startHeight.toLocaleString()} - ${period.endHeight.toLocaleString()}`
        );
        console.log(`  Block Reward: ${period.blockReward} VRSC${status}`);
        console.log(
          `  PoS Reward: ${(period.blockReward * 0.5).toFixed(1)} VRSC`
        );
        console.log('');
      });

      console.log(`🎯 Current Block Reward: ${result.data.currentReward} VRSC`);
      console.log('');
      console.log(
        '💡 This analysis uses real blockchain data instead of assumptions!'
      );
    } else {
      console.error('❌ Analysis failed:', result.error);
      if (result.details) {
        console.error('Details:', result.details);
      }
    }
  } catch (error) {
    console.error('❌ Error running analysis:', error.message);
    console.error('');
    console.error('Make sure your Next.js server is running:');
    console.error('  npm run dev');
    console.error('');
    console.error('And that your Verus daemon is synced and accessible.');
  }
}

// Run the test
testBlockRewardAnalysis().catch(console.error);
