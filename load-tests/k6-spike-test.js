import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

// Spike test configuration - sudden traffic spikes
export const options = {
  scenarios: {
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 }, // Warm up
        { duration: '10s', target: 100 }, // Sudden spike to 100
        { duration: '30s', target: 100 }, // Stay at 100
        { duration: '10s', target: 200 }, // Spike to 200
        { duration: '20s', target: 200 }, // Stay at 200
        { duration: '10s', target: 10 }, // Drop back down
        { duration: '10s', target: 0 }, // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000', 'p(99)<10000'],
    http_req_failed: ['rate<0.2'], // Allow higher error rate for spike test
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

function makeRequest(url, name) {
  const res = http.get(url);

  apiResponseTime.add(res.timings.duration, { endpoint: name });

  const success = check(res, {
    'status is 200': r => r.status === 200,
  });

  errorRate.add(!success);

  return res;
}

export default function () {
  // Test critical endpoints under spike load
  makeRequest(`${BASE_URL}/api/blockchain-info`, 'blockchain-info');
  sleep(0.2);

  makeRequest(`${BASE_URL}/api/consolidated-data`, 'consolidated-data');
  sleep(0.2);

  makeRequest(`${BASE_URL}/api/latest-blocks`, 'latest-blocks');
  sleep(0.2);

  if (Math.random() < 0.3) {
    makeRequest(`${BASE_URL}/api/mempool/transactions`, 'mempool-transactions');
  }

  sleep(Math.random() * 1);
}

export function setup() {
  console.log('Starting spike test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('Test will spike to 100 users, then to 200 users');
  return { startTime: new Date() };
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`\nSpike test completed in ${duration.toFixed(2)} seconds`);
}
