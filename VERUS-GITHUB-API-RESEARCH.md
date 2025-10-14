# Verus GitHub API Research - How Verus Uses Their APIs

## Overview

This document provides a comprehensive analysis of how Verus implements and uses their APIs across their official GitHub repositories, compared with the current implementation in this project.

---

## 1. Official Verus GitHub Repositories

### 1.1 Core Repositories

#### **VerusCoin/VerusCoin** (Main Daemon)

- **Purpose**: Core blockchain daemon with full node implementation
- **API Type**: JSON-RPC over HTTP/HTTPS
- **Key Features**:
  - Full blockchain node with mining capabilities
  - Wallet management and transaction creation
  - Identity (VerusID) system
  - PBaaS (Public Blockchains as a Service)
  - Cross-chain operations
  - Currency conversions and DEX

#### **VerusCoin/Verus-Desktop**

- **Purpose**: Multi-coin desktop wallet
- **Architecture**:
  - **Frontend**: React/Redux UI
  - **Backend**: NodeJS wrapper for daemon communication
  - **Communication**: Direct RPC calls to local daemon
- **API Usage Pattern**:
  ```javascript
  // Verus-Desktop calls daemon directly via RPC
  // NodeJS backend creates localhost endpoint
  // React frontend queries NodeJS backend
  ```

---

## 2. API Usage Patterns in Verus Projects

### 2.1 **VerusChainTools** (PHP Integration)

**Repository**: `VerusCoin/VerusChainTools`

**Purpose**: PHP web interface toolkit for Verus blockchain integration

**Key Implementation Details**:

- **Direct RPC Access**: Bridges PHP applications with Verus daemon
- **Full RPC Control**: Provides complete access to all daemon methods
- **Use Cases**:
  - Web wallets
  - Payment gateways
  - Block explorers
  - Custom dApps

**API Call Pattern**:

```php
// Direct JSON-RPC calls to daemon
// No middleware or caching layer
// Synchronous request/response model
```

**Security**:

- Server-side RPC communication only
- No client-side exposure of RPC credentials
- Configurable authentication

---

### 2.2 **verusid-ts-client** (TypeScript Lite Client)

**Repository**: `VerusCoin/verusid-ts-client`

**Purpose**: TypeScript client for VerusID functionality in lite clients

**Key Features**:

1. **Blockchain Interaction**:
   - Get current blockchain height
   - Retrieve chain ID
   - Query block data

2. **Message Signing**:
   - Sign messages with VerusID
   - Sign hashes
   - Verify signatures

3. **Login Consent Handling**:
   - Create login consent requests
   - Verify consent responses
   - Handle authentication flows

4. **VerusPay Integration**:
   - Create VerusPay v3 invoices
   - Sign invoices
   - Verify invoice signatures

**Implementation Approach**:

- **Lite Client**: Doesn't require full node
- **API Communication**: Uses external APIs (explorers, public nodes)
- **Client-Side Focus**: Designed for browser/mobile environments

**Example Usage**:

```typescript
import { VerusIdInterface } from 'verusid-ts-client';

// Initialize client
const verusId = new VerusIdInterface();

// Sign message
const signature = await verusId.signMessage(message, address);

// Verify signature
const isValid = await verusId.verifyMessage(message, address, signature);

// Create invoice
const invoice = await verusId.createInvoice(amount, currency);
```

---

### 2.3 **VerusPay** (WordPress/WooCommerce Plugin)

**Repository**: `monkins1010/VerusPay`

**Purpose**: Payment gateway for accepting VRSC in e-commerce stores

**Two Operating Modes**:

#### **Live Mode**:

- **Direct RPC Connection**: Connects to local Verus daemon
- **Full Node Required**: Merchant runs full node
- **High Security**: No third-party API dependencies
- **Real-time Verification**: Direct blockchain verification

#### **Manual Mode**:

- **External APIs**: Uses public explorers and APIs
- **No Local Node**: Suitable for shared hosting
- **APIs Used**:
  - `explorer.veruscoin.io` - Transaction verification
  - `veruspay.io/api` - Price data
- **Fallback Option**: For merchants without full node capability

**API Pattern**:

```php
// Live Mode
$rpc->call('getaddressbalance', [$address]);

// Manual Mode
$explorer_api = 'https://explorer.veruscoin.io/api/...';
$price_api = 'https://veruspay.io/api/?currency=USD';
```

**Key Insights**:

- Dual-mode approach accommodates different deployment scenarios
- External APIs used only for price and verification when full node unavailable
- Preference for direct RPC when possible

---

### 2.4 **VerusStatisticsAPI** (Community Project)

**Repository**: `Shreyas-ITB/VerusStatisticsAPI`

**Purpose**: Multipurpose API for Verus statistics and data

**Endpoints**:

- `/` - API health check
- `/price/<ticker>` - VRSC price in various currencies with 24h change
- `/difficulty` - Current network difficulty
- `/bridge` - Verus-Ethereum bridge data
- `/currency/<currencyid>` - Currency state information

**Implementation**:

- **Aggregation Layer**: Combines data from multiple sources
- **Caching**: Implements caching for frequently accessed data
- **Public API**: Hosted service for community use

**Data Sources**:

- Verus daemon (direct RPC)
- Exchange APIs
- Bridge contracts
- Historical data storage

---

### 2.5 **verus-explorer** (Community Explorer)

**Repository**: `pangz-lab/verus-explorer`

**Purpose**: Local blockchain explorer setup

**Technical Stack**:

- **Backend**: NodeJS with Express
- **Frontend**: ReactJS
- **Data Source**: Direct Verus daemon connection
- **Real-time Updates**: ZeroMQ (ZMQ) for live data

**API Architecture**:

```
[Verus Daemon] <--RPC--> [NodeJS API] <--HTTP--> [React Frontend]
                          |
                          v
                    [PostgreSQL DB]
                          |
                          v
                   [Historical Data]
```

**Key Features**:

- **Direct RPC**: All data comes from local daemon
- **Database Indexing**: Stores block/transaction data for fast queries
- **ZMQ Integration**: Real-time block notifications
- **Docker Deployment**: Easy setup and scaling

**RPC Methods Used**:

- `getblockchaininfo` - Chain state
- `getblock` - Block details
- `getrawtransaction` - Transaction data
- `getaddressbalance` - Address balances
- `getaddresstxids` - Address transaction history

---

### 2.6 **PriceApi** (Exchange Price Aggregation)

**Repository**: `OliverCodez/PriceApi`

**Purpose**: Volume-weighted average price across exchanges

**Features**:

- **Multi-Exchange**: Aggregates from all active VRSC exchanges
- **Volume-Weighted**: Calculates true average based on trading volume
- **Fiat Conversion**: Supports multiple fiat currencies
- **Public Endpoint**: Can be self-hosted

**API Pattern**:

```
GET https://veruspay.io/api/?currency=USD
Response:
{
  "price": 0.45,
  "currency": "USD",
  "volume_24h": 123456,
  "change_24h": 2.3,
  "exchanges": [...]
}
```

---

## 3. Common API Patterns Across Verus Projects

### 3.1 **Direct RPC Communication**

**Pattern**: Direct JSON-RPC calls to daemon

```javascript
const response = await fetch(VERUS_RPC_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    jsonrpc: '1.0',
    id: 'request-id',
    method: 'getblockchaininfo',
    params: [],
  }),
});
```

**Used in**:

- Verus-Desktop
- VerusChainTools
- verus-explorer
- VerusPay (Live Mode)

**Advantages**:

- Real-time data
- No third-party dependencies
- Full control over data
- Highest security

**Disadvantages**:

- Requires full node
- Resource intensive
- Scaling challenges

---

### 3.2 **External API Aggregation**

**Pattern**: Query multiple external APIs and aggregate results

```javascript
const [priceData, difficultyData, bridgeData] = await Promise.all([
  fetch('https://api.example.com/price'),
  fetch('https://api.example.com/difficulty'),
  fetch('https://api.example.com/bridge'),
]);
```

**Used in**:

- VerusStatisticsAPI
- PriceApi
- VerusPay (Manual Mode)

**Advantages**:

- No local node required
- Lower resource usage
- Faster deployment
- Shared hosting compatible

**Disadvantages**:

- Third-party dependencies
- Potential downtime
- Data accuracy depends on source
- Privacy concerns

---

### 3.3 **Hybrid Approach**

**Pattern**: Primary source is direct RPC, fallback to external APIs

```javascript
async function getData() {
  try {
    // Try direct RPC first
    return await rpcCall('getdata');
  } catch (error) {
    // Fall back to external API
    return await externalAPI.getData();
  }
}
```

**Used in**:

- VerusPay (supports both modes)
- Some community explorers

**Advantages**:

- Flexibility
- Reliability through redundancy
- Accommodates different deployments

---

### 3.4 **Database Caching Layer**

**Pattern**: Store RPC results in database for fast access

```
[RPC Call] -> [Validate] -> [Store in DB] -> [Serve from DB]
                                   |
                            [Periodic Updates]
```

**Used in**:

- verus-explorer
- VerusStatisticsAPI
- This project (verus-dapp)

**Advantages**:

- Fast query responses
- Reduced RPC load
- Historical data storage
- Complex queries possible

**Disadvantages**:

- Data latency
- Storage requirements
- Sync complexity

---

## 4. Comparison with Current Implementation (verus-dapp)

### 4.1 **Current Architecture**

```
[Verus Daemon] <--RPC--> [Next.js API Routes] <--HTTP--> [React Components]
                              |
                              v
                         [Redis Cache]
                              |
                              v
                         [SQLite DB]
```

### 4.2 **Similarities to Official Verus Projects**

✅ **Direct RPC Communication**:

- Like Verus-Desktop and verus-explorer
- Uses custom `RPCClient` class
- Implements retry logic and error handling

✅ **API Route Pattern**:

- Similar to verus-explorer's Express routes
- Next.js API routes instead of Express
- RESTful endpoints for frontend

✅ **Caching Strategy**:

- Redis cache like VerusStatisticsAPI
- Reduces daemon load
- Improves response times

✅ **Type Safety**:

- TypeScript types like verusid-ts-client
- Comprehensive type definitions
- Better developer experience

### 4.3 **Differences from Official Verus Projects**

🔄 **More Sophisticated Caching**:

- Multi-layer cache (Redis + SQLite)
- Official projects mostly use simple caching or none
- Better for high-traffic scenarios

🔄 **Next.js Framework**:

- Official projects use various frameworks
- Server-side rendering capabilities
- Built-in API routes

🔄 **Database for Historical Data**:

- SQLite for comprehensive history
- Official explorers use PostgreSQL
- Lighter weight for this use case

🔄 **Advanced Error Handling**:

- Custom `RPCErrorHandler` class
- Fallback responses
- More robust than most official implementations

### 4.4 **Areas Aligned with Verus Best Practices**

✅ **Rate Limiting**:

- Implemented in `rpc-client-robust.ts`
- 100ms minimum between calls per method
- Protects daemon from overload

✅ **Retry Logic**:

- Exponential backoff
- Up to 3 retries
- Graceful degradation

✅ **Parameter Validation**:

- Validates RPC params before sending
- Prevents invalid requests
- Returns sensible fallbacks

✅ **Security**:

- Server-side RPC only (never client-side)
- Environment variable configuration
- No credential exposure

---

## 5. Key Learnings from Verus GitHub Projects

### 5.1 **Architectural Decisions**

**From Verus-Desktop**:

- ✅ Separate backend and frontend concerns
- ✅ NodeJS backend for system/RPC operations
- ✅ React frontend for UI only
- ✅ Never expose RPC credentials to client

**From verusid-ts-client**:

- ✅ Create reusable client libraries
- ✅ Abstract complex operations
- ✅ Provide TypeScript types
- ✅ Focus on developer experience

**From VerusPay**:

- ✅ Support multiple deployment scenarios
- ✅ Direct RPC when possible
- ✅ External APIs as fallback
- ✅ Don't require full node if not needed

**From verus-explorer**:

- ✅ Index blockchain data for fast queries
- ✅ Use ZMQ for real-time updates
- ✅ Store historical data
- ✅ Docker for easy deployment

---

### 5.2 **RPC Method Usage Patterns**

**Core Methods Used by All Projects**:

```
getblockchaininfo    - Chain state and sync status
getblock             - Block details
getrawtransaction    - Transaction data
getaddressbalance    - Address balance
getaddresstxids      - Address transaction history
getmininginfo        - Network statistics
```

**Identity Operations** (VerusID projects):

```
getidentity          - Identity details
listidentities       - Search identities
getidentityhistory   - Identity changes
```

**Currency Operations** (PBaaS projects):

```
getcurrency          - Currency definition
listcurrencies       - Available currencies
estimateconversion   - Conversion rates
getcurrencystate     - Current reserves/supply
```

---

### 5.3 **Error Handling Best Practices**

**From VerusChainTools**:

```php
try {
    $result = $rpc->call($method, $params);
} catch (RPCException $e) {
    // Log error
    error_log($e->getMessage());
    // Return error response
    return ['error' => $e->getMessage()];
}
```

**From verusid-ts-client**:

```typescript
try {
  const result = await this.rpcCall(method, params);
  return result;
} catch (error) {
  // Specific error handling
  if (error.code === -5) {
    // Not found
    return null;
  }
  throw error;
}
```

**Pattern**: Always catch and handle RPC errors gracefully

---

### 5.4 **Performance Optimization**

**Batching** (from Verus-Desktop):

```javascript
// Batch multiple RPC calls
const batch = [
  { method: 'getblock', params: [hash1] },
  { method: 'getblock', params: [hash2] },
  { method: 'getblock', params: [hash3] },
];
const results = await rpc.batch(batch);
```

**Caching** (from VerusStatisticsAPI):

```python
@cache.cached(timeout=60)  # Cache for 60 seconds
def get_price(ticker):
    return rpc.call('getcurrency', [ticker])
```

**Indexing** (from verus-explorer):

- Index blocks as they arrive
- Store in database with proper indexes
- Query database instead of daemon for historical data

---

## 6. Recommendations for verus-dapp

### 6.1 **Currently Doing Well**

✅ **Direct RPC Communication**: Following official pattern
✅ **Server-Side Only**: Security best practice
✅ **Type Safety**: Better than most official projects
✅ **Error Handling**: More robust than typical implementations
✅ **Caching Strategy**: Appropriate for use case
✅ **API Route Structure**: Clean and organized

### 6.2 **Potential Improvements**

#### **A. Add Batch RPC Support**

```typescript
// Add to RPCClient
async batch(calls: Array<{ method: string, params: any[] }>) {
    const batchRequest = calls.map((call, i) => ({
        jsonrpc: '1.0',
        id: i,
        method: call.method,
        params: call.params
    }));

    return await this.rawCall(batchRequest);
}
```

#### **B. Implement ZMQ for Real-Time Updates**

- Like verus-explorer does
- Real-time block notifications
- No polling required
- More efficient

#### **C. Create Client Library**

- Following verusid-ts-client pattern
- Reusable across projects
- Better abstraction
- npm package for community

#### **D. Add Fallback API Sources**

- Like VerusPay's dual-mode approach
- Fallback to public explorers if local daemon down
- Improves reliability

---

## 7. Verus API Ecosystem Map

```
┌─────────────────────────────────────────────────────────────┐
│                    Verus Daemon (Core)                      │
│                  Full Node + JSON-RPC API                   │
└────────────────────────────┬────────────────────────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌─────────────┐   ┌────────────┐   ┌─────────────┐
    │Verus-Desktop│   │  Explorer  │   │VerusChain   │
    │  (Electron) │   │  (Web UI)  │   │Tools (PHP)  │
    └─────────────┘   └────────────┘   └─────────────┘
           │                 │                 │
           │                 ▼                 │
           │          ┌────────────┐           │
           │          │  Database  │           │
           │          │  (Indexed) │           │
           │          └────────────┘           │
           │                                   │
           └───────────────┬───────────────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │  External APIs   │
                 ├──────────────────┤
                 │ • PriceApi       │
                 │ • StatisticsAPI  │
                 │ • VerusPay API   │
                 └──────────────────┘
                           │
                           ▼
                   ┌──────────────┐
                   │    Lite      │
                   │   Clients    │
                   ├──────────────┤
                   │ • verusid-ts │
                   │ • Mobile Apps│
                   │ • Web Wallets│
                   └──────────────┘
```

---

## 8. Conclusion

### 8.1 **Verus API Philosophy**

Based on analysis of official repositories:

1. **Direct RPC First**: When possible, always use direct daemon connection
2. **Security Paramount**: Never expose RPC to client-side
3. **Flexibility**: Support different deployment scenarios
4. **Type Safety**: Encourage strong typing (TypeScript)
5. **Graceful Degradation**: Handle errors, provide fallbacks
6. **Performance**: Cache when appropriate, batch when possible
7. **Accessibility**: Provide APIs for developers without full nodes

### 8.2 **Current Project Alignment**

**verus-dapp is well-aligned with official Verus patterns**:

- ✅ Direct RPC communication
- ✅ Server-side security
- ✅ Type safety
- ✅ Error handling
- ✅ Caching strategy
- ✅ Clean API structure

**Areas for potential enhancement**:

- Consider ZMQ for real-time data
- Add batch RPC support
- Create reusable client library
- Add fallback API sources

### 8.3 **Key Takeaways**

1. **Your implementation follows Verus best practices**
2. **You're using appropriate patterns for a web explorer**
3. **Your caching strategy is more sophisticated than most official projects**
4. **Consider adding real-time updates via ZMQ**
5. **Batch RPC could improve performance**
6. **Overall architecture is sound and production-ready**

---

## 9. Additional Resources

### Official Verus GitHub Organizations

- **VerusCoin**: https://github.com/VerusCoin
- **Verus-Desktop**: https://github.com/VerusCoin/Verus-Desktop
- **verusid-ts-client**: https://github.com/VerusCoin/verusid-ts-client

### Community Projects

- **verus-explorer**: https://github.com/pangz-lab/verus-explorer
- **VerusStatisticsAPI**: https://github.com/Shreyas-ITB/VerusStatisticsAPI
- **VerusPay**: https://github.com/monkins1010/VerusPay
- **PriceApi**: https://github.com/OliverCodez/PriceApi

### Documentation

- **Verus Wiki**: https://wiki.verus.io
- **RPC Documentation**: In-daemon via `help` command
- **Community Discord**: Technical discussions and support

---

_Research compiled: October 8, 2025_
_Based on: Official Verus GitHub repositories and community projects_


