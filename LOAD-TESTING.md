# Load Testing Guide for VerusPulse

## ✅ Setup Complete!

Your VerusPulse application has been tested with **100 concurrent users**. The load testing infrastructure is now fully set up and ready to use.

## 📊 Test Results Summary

**Test Date:** October 18, 2025  
**Concurrent Users:** 100  
**Duration:** 3 minutes  

### Key Metrics

| Metric | Result | Status |
|--------|--------|--------|
| Total Requests | 1,391 | ✅ |
| Failed Requests | 49 (3.5%) | ⚠️ |
| Average Response Time | 10,178 ms (~10s) | ⚠️ Needs improvement |
| P95 Response Time | 19,923 ms (~20s) | ⚠️ Needs improvement |
| Max Response Time | 37,075 ms (~37s) | ⚠️ Critical |
| Throughput | 7.32 req/s | ℹ️ |

**Full report:** [`load-tests/results/LOAD-TEST-SUMMARY.md`](load-tests/results/LOAD-TEST-SUMMARY.md)

## 🚀 Quick Start

### Run Load Tests

```bash
# Standard load test (100 users, 3 minutes)
npm run test:load

# Quick test (50 users, 1 minute) - for rapid iteration
npm run test:load:quick

# Spike test (traffic surges to 200 users)
npm run test:load:spike

# Stress test (gradually increase to 250 users)
npm run test:load:stress

# Run all tests
npm run test:load:all
```

### Monitor Server During Tests

Open a second terminal and run:
```bash
npm run monitor
```

This will show real-time server health, memory usage, CPU, and component status.

## 📁 What Was Created

```
load-tests/
├── k6-load-test.js           # Main load test (100 users)
├── k6-spike-test.js          # Spike test (sudden traffic)
├── k6-stress-test.js         # Stress test (find limits)
├── run-load-tests.sh         # Test runner script
├── quick-test.sh             # Quick test for iterations
├── monitor-during-test.sh    # Real-time monitoring
├── INSTALL-K6.md             # k6 installation guide
├── README.md                 # Comprehensive documentation
└── results/
    └── LOAD-TEST-SUMMARY.md  # Latest test results
```

## 🎯 Current Performance Analysis

### ✅ What's Working

1. **Server Stability** - Handled 100 concurrent users without crashing
2. **Low Error Rate** - Only 3.5% request failures
3. **Complete Test** - Successfully tested all major endpoints

### ⚠️ Areas for Improvement

1. **Slow Response Times** (High Priority)
   - Average: 10 seconds (target: <1 second)
   - 95% of requests: 20 seconds (target: <3 seconds)
   - Maximum: 37 seconds (target: <10 seconds)

2. **Low Throughput**
   - Current: 7.32 requests/second
   - Target: 50+ requests/second

3. **Request Failures**
   - Current: 3.5% failure rate
   - Target: <1% failure rate

## 🔧 Recommended Optimizations

### Priority 1: Immediate Actions

1. **Implement Aggressive Caching**
   ```typescript
   // In your API routes
   export const revalidate = 30; // Cache for 30 seconds
   
   // Or use Redis caching
   const cached = await redis.get(cacheKey);
   if (cached) return JSON.parse(cached);
   ```

2. **Optimize Database Queries**
   - Add indexes to frequently queried fields
   - Use query result caching
   - Implement connection pooling

3. **Cache Strategy by Endpoint**
   ```
   /api/blockchain-info         → 30 seconds
   /api/block/[hash]            → Indefinitely (immutable)
   /api/verusid/[iaddr]/stats   → 2 minutes
   /api/mempool/transactions    → 5 seconds
   ```

### Priority 2: Short-term Improvements

4. **Profile Slow Endpoints**
   - Enable detailed logging
   - Measure RPC call times
   - Identify bottlenecks

5. **Optimize Heavy Operations**
   - `/api/consolidated-data` - Complex aggregations
   - `/api/verusid/[iaddr]/staking-stats` - Heavy calculations
   - `/api/verusids/browse` - Large datasets

6. **Add Rate Limiting**
   - Protect from overload
   - Queue expensive operations

### Priority 3: Long-term Goals

7. **Horizontal Scaling**
   - Deploy multiple instances
   - Add load balancer
   - Use shared Redis cache

8. **Performance Monitoring**
   - Add APM (Sentry, DataDog, New Relic)
   - Track slow queries
   - Monitor cache hit rates

## 📈 Performance Targets

After optimizations, aim for:

| Metric | Current | Target |
|--------|---------|--------|
| Avg Response Time | 10,178 ms | <1,000 ms |
| P95 Response Time | 19,923 ms | <2,000 ms |
| Error Rate | 3.5% | <1% |
| Throughput | 7.32 req/s | >50 req/s |
| Concurrent Users | 100 | 200+ |

## 🔍 Understanding the Results

### Load Test Stages

1. **Ramp-up** (30s): Gradually increase from 0 → 100 users
2. **Sustained Load** (2m): Maintain 100 concurrent users
3. **Ramp-down** (30s): Gradually decrease 100 → 0 users

### Response Time Metrics

- **Average**: Mean time for all requests
- **P95**: 95% of requests faster than this
- **P99**: 99% of requests faster than this
- **Max**: Slowest request in the test

### What's Good?

- P95 < 1000ms: Excellent
- P95 < 2000ms: Good
- P95 < 5000ms: Acceptable
- P95 > 5000ms: Needs improvement

### Your Results

- P95: 19,923ms (19.9 seconds) ⚠️
- This means 95% of users wait ~20 seconds for responses
- **Action needed**: Implement caching and optimize queries

## 🛠️ Testing Workflow

### 1. Before Optimization

```bash
# Run baseline test
npm run test:load

# Note the results
```

### 2. Make Optimizations

```bash
# Example: Add caching to an endpoint
# Edit: app/api/blockchain-info/route.ts
export const revalidate = 30;
```

### 3. Test Again

```bash
# Quick test to verify improvement
npm run test:load:quick

# Full test if quick test looks good
npm run test:load
```

### 4. Compare Results

```bash
# Check results directory
ls -la load-tests/results/
cat load-tests/results/LOAD-TEST-SUMMARY.md
```

### 5. Iterate

Repeat steps 2-4 until you reach your performance targets.

## 📊 Test Scenarios Included

The load test simulates realistic user behavior:

1. **Homepage Visit** (100% of users)
   - Load main page
   - Check blockchain info

2. **Dashboard Browsing** (100% of users)
   - View consolidated data
   - Check latest blocks
   - Check latest transactions
   - View mempool

3. **VerusID Exploration** (30% of users)
   - Browse VerusID list
   - View VerusID stats

4. **Specific VerusID Lookup** (20% of users)
   - View specific VerusID details
   - Check staking statistics

5. **Network Stats** (40% of users)
   - View network statistics
   - Check mining info

6. **Advanced Features** (15-25% of users)
   - Mempool stats
   - Autocomplete search
   - Block lookups

## 🐛 Troubleshooting

### k6 Not Found

If you get "k6 not found":
```bash
# Add k6 to PATH
export PATH="$HOME/bin:$PATH"

# Or reinstall
cd /tmp
curl -L https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz -o k6.tar.gz
tar -xzf k6.tar.gz
mkdir -p ~/bin
cp k6-v0.48.0-linux-amd64/k6 ~/bin/
chmod +x ~/bin/k6
```

### Server Not Responding

Make sure your server is running:
```bash
# Development
npm run dev

# Or production
npm run build
npm start
```

### High Error Rates

Check:
1. Server logs for errors
2. Redis is running: `redis-cli ping`
3. Database connections
4. RPC daemon is accessible

### Permission Denied

Make scripts executable:
```bash
chmod +x load-tests/*.sh
```

## 📚 Additional Resources

- **k6 Documentation**: https://k6.io/docs/
- **Load Testing Best Practices**: https://k6.io/docs/testing-guides/
- **Performance Optimization**: See `load-tests/results/LOAD-TEST-SUMMARY.md`

## 🎓 Next Steps

1. ✅ **Review the test results** in `load-tests/results/LOAD-TEST-SUMMARY.md`
2. 🔧 **Implement caching** on slow endpoints
3. 🔍 **Profile database queries** and add indexes
4. 📊 **Re-run tests** to measure improvements
5. 🚀 **Iterate** until you reach performance targets
6. 📈 **Set up monitoring** for production
7. ⚡ **Continue optimizing** based on real-world usage

## 💡 Pro Tips

1. **Test Often**: Run quick tests after each optimization
2. **Monitor Resources**: Use the monitoring script during tests
3. **Test Realistic Scenarios**: Adjust test scenarios to match your actual usage
4. **Set Baselines**: Record baseline performance before changes
5. **Test in Production-like Environment**: Use similar hardware/network
6. **Gradual Load**: Always ramp up gradually, don't spike immediately
7. **Document Changes**: Note what optimizations had the biggest impact

## 🎉 Conclusion

Your VerusPulse application successfully handled 100 concurrent users! While there's room for improvement in response times, the foundation is solid. 

**Key Takeaways:**
- ✅ Server is stable under load
- ✅ Load testing infrastructure is ready
- ⚠️ Response times need optimization
- 🎯 Target: <2s response time for 95% of requests
- 🚀 With caching and optimization, 200+ concurrent users is achievable

**Get Started:**
```bash
npm run test:load
```

Good luck with your optimizations! 🚀

