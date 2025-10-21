import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const requestCount = new Counter('request_count');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Ramp up to 100 users over 30 seconds, maintain for 2 minutes
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 }, // Ramp up to 100 users
        { duration: '2m', target: 100 }, // Stay at 100 users for 2 minutes
        { duration: '30s', target: 0 }, // Ramp down to 0 users
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // Define acceptable performance thresholds
    http_req_duration: ['p(95)<3000', 'p(99)<5000'], // 95% of requests under 3s, 99% under 5s
    http_req_failed: ['rate<0.1'], // Error rate should be less than 10%
    errors: ['rate<0.1'],
  },
};

// Base URL - change this to your deployment URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Sample data for realistic testing
const sampleIAddresses = [
  'iCSq1Ek52j3jEKMHv6yWJdCJHEPUUiB2Dt',
  'iExBJfZYK7KREDpuhj6PzZBzqMAKaFg7d2',
];

const sampleBlockHashes = [
  '0000000000a35bca11b84d7b6e4b3d3b2e4e3e4e3e4e3e4e3e4e3e4e3e4e3e4e',
];

const sampleTxids = [
  'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
];

// Helper function to make requests and record metrics
function makeRequest(url, name) {
  const res = http.get(url);

  requestCount.add(1);
  apiResponseTime.add(res.timings.duration, { endpoint: name });

  const success = check(res, {
    'status is 200': r => r.status === 200,
    'response time OK': r => r.timings.duration < 5000,
  });

  errorRate.add(!success);

  return res;
}

// Main test function - simulates realistic user behavior
export default function () {
  // Scenario: User visits the homepage
  makeRequest(`${BASE_URL}/`, 'homepage');
  sleep(1);

  // Scenario: User checks blockchain info
  makeRequest(`${BASE_URL}/api/blockchain-info`, 'blockchain-info');
  sleep(0.5);

  // Scenario: User views consolidated dashboard data
  makeRequest(`${BASE_URL}/api/consolidated-data`, 'consolidated-data');
  sleep(1);

  // Scenario: User checks latest blocks
  makeRequest(`${BASE_URL}/api/latest-blocks`, 'latest-blocks');
  sleep(0.5);

  // Scenario: User checks latest transactions
  makeRequest(`${BASE_URL}/api/latest-transactions`, 'latest-transactions');
  sleep(0.5);

  // Scenario: User checks mempool
  makeRequest(`${BASE_URL}/api/mempool/transactions`, 'mempool-transactions');
  sleep(0.5);

  // Scenario: User browses VerusIDs (30% of users)
  if (Math.random() < 0.3) {
    makeRequest(
      `${BASE_URL}/api/verusids/browse?page=1&limit=20`,
      'verusids-browse'
    );
    sleep(1);

    // Some users check VerusID stats
    if (Math.random() < 0.5) {
      makeRequest(`${BASE_URL}/api/verusids/stats`, 'verusids-stats');
      sleep(0.5);
    }
  }

  // Scenario: User checks specific VerusID (20% of users)
  if (Math.random() < 0.2 && sampleIAddresses.length > 0) {
    const iAddr =
      sampleIAddresses[Math.floor(Math.random() * sampleIAddresses.length)];
    makeRequest(`${BASE_URL}/api/verusid/${iAddr}/stats`, 'verusid-stats');
    sleep(1);

    // User checks staking stats for this ID
    makeRequest(
      `${BASE_URL}/api/verusid/${iAddr}/staking-stats`,
      'verusid-staking-stats'
    );
    sleep(1);
  }

  // Scenario: User checks network stats (40% of users)
  if (Math.random() < 0.4) {
    makeRequest(`${BASE_URL}/api/network-stats`, 'network-stats');
    sleep(0.5);

    makeRequest(`${BASE_URL}/api/mining-info`, 'mining-info');
    sleep(0.5);
  }

  // Scenario: User checks mempool stats (25% of users)
  if (Math.random() < 0.25) {
    makeRequest(`${BASE_URL}/api/mempool/stats`, 'mempool-stats');
    sleep(0.5);
  }

  // Scenario: User searches autocomplete (15% of users)
  if (Math.random() < 0.15) {
    makeRequest(
      `${BASE_URL}/api/verusids/autocomplete?query=ver`,
      'verusids-autocomplete'
    );
    sleep(0.5);
  }

  // Random sleep between user actions (realistic behavior)
  sleep(Math.random() * 2 + 1); // Sleep 1-3 seconds
}

// Setup function - runs once per VU at the start
export function setup() {
  console.log('Starting load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('Test will ramp up to 100 concurrent users');

  // Check if the server is available
  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) {
    console.warn('Warning: Health check failed. Server may not be ready.');
  }

  return { startTime: new Date() };
}

// Teardown function - runs once after all VUs finish
export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`\nLoad test completed in ${duration.toFixed(2)} seconds`);
}

// Handle summary - generate custom test summary
export function handleSummary(data) {
  const httpReqs = data.metrics.http_reqs || {};
  const httpReqFailed = data.metrics.http_req_failed || {};
  const httpReqDuration = data.metrics.http_req_duration || {};

  const summary = {
    'Test Summary': {
      'Total Requests': (httpReqs.values && httpReqs.values.count) || 0,
      'Failed Requests':
        (httpReqFailed.values && httpReqFailed.values.passes) || 0,
      'Avg Response Time': `${((httpReqDuration.values && httpReqDuration.values.avg) || 0).toFixed(2)}ms`,
      'P95 Response Time': `${((httpReqDuration.values && httpReqDuration.values['p(95)']) || 0).toFixed(2)}ms`,
      'P99 Response Time': `${((httpReqDuration.values && httpReqDuration.values['p(99)']) || 0).toFixed(2)}ms`,
      'Max Response Time': `${((httpReqDuration.values && httpReqDuration.values.max) || 0).toFixed(2)}ms`,
      'Requests/sec': ((httpReqs.values && httpReqs.values.rate) || 0).toFixed(
        2
      ),
    },
  };

  console.log('\n' + '='.repeat(60));
  console.log('LOAD TEST SUMMARY');
  console.log('='.repeat(60));
  for (const [key, value] of Object.entries(summary['Test Summary'])) {
    console.log(`${key}: ${value}`);
  }
  console.log('='.repeat(60) + '\n');

  return {
    stdout: JSON.stringify(summary, null, 2),
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
}
