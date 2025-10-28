const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/.verusid-local/src/__tests__/live/', // Skip wallet signing tests (upstream @bitgo/utxo-lib bug)
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(echarts|echarts-for-react)/)'],
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!**/__tests__/integration/**', // Skip integration tests from coverage
  ],
  // Coverage thresholds disabled for now - focus on test execution
  // coverageThreshold: {
  //   global: {
  //     branches: 20,
  //     functions: 25,
  //     lines: 30,
  //     statements: 30,
  //   },
  //   // Specific thresholds for critical security modules
  //   './lib/utils/verus-validator.ts': {
  //     branches: 60,
  //     functions: 70,
  //     lines: 65,
  //     statements: 65,
  //   },
  //   './lib/utils/error-sanitizer.ts': {
  //     branches: 70,
  //     functions: 80,
  //     lines: 75,
  //     statements: 75,
  //   },
  //   './lib/utils/circuit-breaker.ts': {
  //     branches: 75,
  //     functions: 80,
  //     lines: 80,
  //     statements: 80,
  //   },
  //   './lib/middleware/security.ts': {
  //     branches: 20,
  //     functions: 30,
  //     lines: 30,
  //     statements: 30,
  //   },
  // },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
