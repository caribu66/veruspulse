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
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
    // Specific thresholds for critical security modules
    './lib/utils/verus-validator.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './lib/utils/error-sanitizer.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './lib/utils/circuit-breaker.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './lib/middleware/security.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
