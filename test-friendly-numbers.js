// Test script to demonstrate friendly number formatting
const {
  formatFriendlyNumber,
  formatCryptoValue,
} = require('./lib/utils/number-formatting.ts');

console.log('🔢 Friendly Number Formatting Examples:');
console.log('=====================================');

const testNumbers = [
  339030, // Like your staking balance
  254703759364044, // Large received amount
  3159204022453, // Current balance in satoshis
  165560, // Average stake age
  0.064, // Rewards per day
  1557, // Days active
  1000000, // 1 million
  2500000, // 2.5 million
  0.00000123, // Very small number
];

testNumbers.forEach(num => {
  const friendly = formatFriendlyNumber(num, { precision: 2 });
  const crypto = formatCryptoValue(num / 100000000, 'VRSC');
  console.log(
    `${num.toLocaleString()} → ${friendly} (friendly) | ${crypto} (crypto)`
  );
});

console.log('\n📊 Before vs After:');
console.log('==================');
console.log('Before: 339,030 VRSC');
console.log('After:  339.0K VRSC ✅');
console.log('');
console.log('Before: 2,547,037,593,640.44 VRSC');
console.log('After:  2.55T VRSC ✅');
console.log('');
console.log('Before: 31,592,040.22 VRSC');
console.log('After:  31.59M VRSC ✅');
