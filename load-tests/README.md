# Load Testing Suite for VerusPulse

This directory contains load testing scripts for testing the VerusPulse blockchain explorer under various load conditions.

## Prerequisites

### Install k6

**macOS (using Homebrew):**

```bash
brew install k6
```

**Linux (Debian/Ubuntu):**

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Using Docker:**

```bash
docker pull grafana/k6:latest
```

For more installation options, visit: https://k6.io/docs/getting-started/installation/

## Available Tests

### 1. Load Test (`k6-load-test.js`)

Simulates realistic user behavior with 100 concurrent users.

- **Duration**: ~3 minutes
- **Users**: Ramps up to 100 concurrent users
- **Scenarios**: Homepage visits, API calls, VerusID lookups, block exploration
- **Use Case**: Test normal production load

### 2. Spike Test (`k6-spike-test.js`)

Tests how the system handles sudden traffic spikes.

- **Duration**: ~2 minutes
- **Users**: Spikes from 10 → 100 → 200 users
- **Use Case**: Test system resilience during traffic surges

### 3. Stress Test (`k6-stress-test.js`)

Gradually increases load to find the system's breaking point.

- **Duration**: ~10 minutes
- **Users**: Gradually increases from 0 to 250 users
- **Use Case**: Find system limits and bottlenecks

## Running Tests

### Quick Start

Make the run script executable:

```bash
chmod +x load-tests/run-load-tests.sh
```

Run the standard load test (100 users):

```bash
./load-tests/run-load-tests.sh load
```

### All Test Types

**Load Test (100 concurrent users):**

```bash
./load-tests/run-load-tests.sh load
```

**Spike Test (sudden traffic spikes):**

```bash
./load-tests/run-load-tests.sh spike
```

**Stress Test (find system limits):**

```bash
./load-tests/run-load-tests.sh stress
```

**Run All Tests:**

```bash
./load-tests/run-load-tests.sh all
```

### Custom Base URL

Test against a different server:

```bash
BASE_URL=http://your-server.com ./load-tests/run-load-tests.sh load
```

### Direct k6 Usage

You can also run k6 directly:

```bash
k6 run load-tests/k6-load-test.js
k6 run load-tests/k6-spike-test.js
k6 run load-tests/k6-stress-test.js
```

With custom options:

```bash
BASE_URL=http://localhost:3000 k6 run load-tests/k6-load-test.js
```

## Understanding Results

### Key Metrics

- **http_req_duration**: Time to complete HTTP requests
  - `avg`: Average response time
  - `p(95)`: 95th percentile - 95% of requests were faster than this
  - `p(99)`: 99th percentile - 99% of requests were faster than this
  - `max`: Slowest request

- **http_req_failed**: Percentage of failed requests
  - Should be < 10% for load test
  - Should be < 20% for spike test
  - Should be < 30% for stress test

- **http_reqs**: Total number of requests made
- **vus**: Number of virtual users (concurrent users)
- **vus_max**: Maximum number of concurrent users reached

### Success Criteria

**Load Test:**

- ✅ 95% of requests complete in < 3 seconds
- ✅ 99% of requests complete in < 5 seconds
- ✅ Error rate < 10%

**Spike Test:**

- ✅ 95% of requests complete in < 5 seconds
- ✅ 99% of requests complete in < 10 seconds
- ✅ Error rate < 20%
- ✅ System recovers after spike

**Stress Test:**

- 📊 Identify the maximum number of users the system can handle
- 📊 Find bottlenecks and performance degradation points
- 📊 Measure graceful degradation

## Interpreting Results

### Good Performance

```
http_req_duration.............: avg=450ms   p(95)=1.2s   p(99)=2.1s
http_req_failed...............: 1.2% (12 of 1000)
```

### Warning Signs

```
http_req_duration.............: avg=2.5s    p(95)=5.8s   p(99)=12.3s
http_req_failed...............: 15% (150 of 1000)
```

### Critical Issues

```
http_req_duration.............: avg=8.2s    p(95)=25s    p(99)=45s
http_req_failed...............: 35% (350 of 1000)
```

## Results Storage

Test results are saved in JSON format in:

```
load-tests/results/
  ├── load-test-YYYYMMDD-HHMMSS.json
  ├── spike-test-YYYYMMDD-HHMMSS.json
  └── stress-test-YYYYMMDD-HHMMSS.json
```

## Customizing Tests

### Modify User Count

Edit the test file (e.g., `k6-load-test.js`):

```javascript
stages: [
  { duration: '30s', target: 200 }, // Change 100 to 200 users
  { duration: '2m', target: 200 },
  { duration: '30s', target: 0 },
],
```

### Add Custom Endpoints

Add to the test scenarios in the default function:

```javascript
makeRequest(`${BASE_URL}/api/your-endpoint`, 'your-endpoint-name');
```

### Adjust Thresholds

Modify the thresholds in the options:

```javascript
thresholds: {
  http_req_duration: ['p(95)<2000', 'p(99)<4000'], // More strict
  http_req_failed: ['rate<0.05'],  // Allow only 5% errors
},
```

## Troubleshooting

### Server Not Responding

Make sure your server is running:

```bash
npm run dev
# or
npm run build && npm start
```

### High Error Rates

- Check server logs for errors
- Verify database connections
- Check Redis/cache availability
- Monitor system resources (CPU, memory, disk I/O)

### Slow Response Times

- Check API endpoint performance
- Review database query efficiency
- Monitor cache hit rates
- Check external RPC calls to Verus daemon

## Best Practices

1. **Start with Load Test**: Run the standard load test first
2. **Monitor Resources**: Watch CPU, memory, and network during tests
3. **Test Production-like**: Use production-like data and configuration
4. **Run Multiple Times**: Run tests multiple times to get consistent results
5. **Test During Development**: Include load testing in your CI/CD pipeline
6. **Document Baseline**: Record baseline performance for comparison

## Integration with CI/CD

Add to your `.github/workflows` or CI pipeline:

```bash
# Run load test as part of deployment validation
./load-tests/run-load-tests.sh load
```

## Advanced Usage

### Generate HTML Report

```bash
k6 run --out json=results.json load-tests/k6-load-test.js
```

### Stream Metrics to Grafana

```bash
k6 run --out influxdb=http://localhost:8086/k6 load-tests/k6-load-test.js
```

### Run with Docker

```bash
docker run --network="host" -v $PWD:/scripts grafana/k6 run /scripts/load-tests/k6-load-test.js
```

## Support

For k6 documentation: https://k6.io/docs/
For VerusPulse issues: Create an issue in the repository
