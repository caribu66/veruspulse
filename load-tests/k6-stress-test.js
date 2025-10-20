import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

// Stress test configuration - gradually increase load to find breaking point
export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // Ramp to 50 users
        { duration: '1m', target: 100 },  // Ramp to 100 users
        { duration: '2m', target: 150 },  // Ramp to 150 users
        { duration: '2m', target: 200 },  // Ramp to 200 users
        { duration: '1m', target: 250 },  // Ramp to 250 users
        { duration: '2m', target: 250 },  // Stay at 250 users
        { duration: '1m', target: 0 },    // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<10000'], // More lenient for stress test
    http_req_failed: ['rate<0.3'],      // Allow higher error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

function makeRequest(url, name) {
  const res = http.get(url);
  
  apiResponseTime.add(res.timings.duration, { endpoint: name });
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
  });
  
  errorRate.add(!success);
  
  return res;
}

export default function () {
  // Mix of different endpoint types
  const endpoints = [
    { url: `${BASE_URL}/api/blockchain-info`, name: 'blockchain-info' },
    { url: `${BASE_URL}/api/consolidated-data`, name: 'consolidated-data' },
    { url: `${BASE_URL}/api/latest-blocks`, name: 'latest-blocks' },
    { url: `${BASE_URL}/api/latest-transactions`, name: 'latest-transactions' },
    { url: `${BASE_URL}/api/mempool/stats`, name: 'mempool-stats' },
    { url: `${BASE_URL}/api/verusids/browse?page=1&limit=10`, name: 'verusids-browse' },
  ];
  
  // Random endpoint selection
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  makeRequest(endpoint.url, endpoint.name);
  
  sleep(Math.random() * 0.5);
}

export function setup() {
  console.log('Starting stress test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('Test will gradually increase load up to 250 users');
  return { startTime: new Date() };
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`\nStress test completed in ${duration.toFixed(2)} seconds`);
}

