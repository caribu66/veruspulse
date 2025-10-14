# Nymia Desktop API Analysis

## Overview

Nymia Desktop is a decentralized P2P chat application built on Verus blockchain using **Tauri + Rust** for the backend and **SvelteKit** for the frontend. This document analyzes their API architecture and extracts lessons applicable to blockchain explorers and dApps.

**Repository**: https://github.com/Meyse/nymia-desktop

---

## Architecture Comparison

| Aspect         | Nymia Desktop      | Your Verus-dApp          |
| -------------- | ------------------ | ------------------------ |
| **Platform**   | Desktop (Tauri)    | Web (Next.js)            |
| **Backend**    | Rust               | Node.js/TypeScript       |
| **Frontend**   | SvelteKit          | React/Next.js            |
| **RPC Client** | Custom Rust client | Custom TypeScript client |
| **Purpose**    | P2P Messaging      | Blockchain Explorer      |
| **Deployment** | Desktop App        | Web Application          |

---

## Key API Modules

Nymia organizes their Rust backend into clean, modular RPC clients:

### 1. **Core RPC Client** (`rpc_client.rs`)

- Generic RPC call handler with error handling
- Message signing (`signmessage` RPC)
- Message verification (`verifymessage` RPC)
- Cryptographic signature system for zero-trust messaging

**Key Functions:**

```rust
pub async fn make_rpc_call<T>(
    rpc_user: &str,
    rpc_pass: &str,
    rpc_port: u16,
    method: &str,
    params: Vec<Value>,
) -> Result<T, VerusRpcError>

pub async fn sign_message(...) -> Result<SignatureResponse, VerusRpcError>
pub async fn verify_message(...) -> Result<bool, VerusRpcError>
```

**Lesson for Explorer**: Your `/lib/rpc-client.ts` follows a similar pattern but could benefit from their structured error handling with specific error types.

---

### 2. **Identity RPC** (`identity_rpc.rs`)

Handles all VerusID-related operations with progressive loading optimization.

**Key Features:**

- **Fast loading**: `get_login_identities_fast()` - loads identities without balances first
- **Progressive loading**: `get_identity_balance()` - fetches individual balances afterward
- **Identity filtering**: Only shows identities with:
  - Private address (z-address)
  - `canspendfor = true`
  - `cansignfor = true`
- **Identity registration**: Complete workflow for registering new VerusIDs
  - `register_name_commitment()`
  - `register_identity()`
  - `wait_for_confirmations()`
  - `wait_for_identity_ready()`

**API Endpoints:**

```rust
get_login_identities_fast() -> Vec<FormattedIdentity>
get_login_identities() -> Vec<FormattedIdentity> // with balances
get_identity_balance(address) -> f64
check_identity_eligibility(name) -> FormattedIdentity
check_identity_exists(name) -> bool
register_name_commitment(...) -> NameCommitmentResponse
register_identity(bundle) -> String // txid
get_new_address() -> String
get_new_private_address() -> String
dump_privkey(address) -> String
export_z_key(z_address) -> String
```

**Lesson for Explorer**:

- Your explorer could add VerusID features:
  - Identity lookup and verification
  - Identity creation tracking
  - Identity timeline/history
  - Sub-identity tree visualization

---

### 3. **Message RPC** (`message_rpc.rs`)

Implements blockchain-as-message-transport with cryptographic security.

**Message Format:**

```
{message_text}//f//{sender_identity}//t//{unix_timestamp}//{signature}
```

**Security Features:**

- **Zero-trust**: Only verified messages are displayed
- **Mandatory signing**: All messages must be cryptographically signed
- **Signature verification**: Each message is verified using `verifymessage` RPC
- **Timestamp-based ordering**: Messages sorted by Unix timestamp (not block height)

**Key Functions:**

```rust
get_chat_history(identity, own_address) -> Vec<ChatMessage>
get_new_received_messages(own_address) -> Vec<ChatMessage>
send_private_message(from, to, memo, identity, amount) -> String // txid
```

**Message Structure:**

```rust
pub struct ChatMessage {
    pub id: String,           // txid
    pub sender: String,       // VerusID
    pub text: String,         // Message content
    pub timestamp: u64,       // Unix timestamp
    pub amount: f64,          // Optional gift amount
    pub confirmations: i64,
    pub direction: String,    // "received" | "sent"
}
```

**Lesson for Explorer**:

- Transaction memo analysis could be added
- Message/data transaction filtering
- Signature verification for data authenticity
- On-chain communication tracking

---

### 4. **Wallet RPC** (`wallet_rpc.rs`)

Comprehensive wallet operations beyond basic balance queries.

**Key Features:**

**UTXO Management:**

```rust
pub struct UtxoInfo {
    pub total_utxos: u32,
    pub usable_utxos: u32,           // >= 0.0001
    pub total_spendable_value: f64,
    pub largest_utxo: f64,
    pub smallest_utxo: f64,
}

get_utxo_info(address) -> UtxoInfo
```

- Used for "Fast Messages" feature
- Enables rapid successive transactions when multiple UTXOs available

**Currency Conversion:**

```rust
estimate_conversion(request) -> f64
initiate_currency_conversion(...) -> String // txid
get_wallet_addresses() -> Vec<String>
get_address_currency_balances(address) -> HashMap<String, f64>
```

**Wallet Info:**

```rust
pub struct WalletInfo {
    pub balance: f64,
    pub unconfirmed_balance: f64,
    pub reserve_balance: HashMap<String, f64>,
    pub paytxfee: f64,
}
```

**Lesson for Explorer**:

- UTXO visualization for addresses
- Currency conversion calculator
- Multi-currency balance tracking
- Reserve currency analytics

---

### 5. **Namespace RPC** (`namespace_rpc.rs`)

Handles namespace/currency selection for VerusID registration.

**Key Features:**

- Lists all available namespaces/currencies
- Filters by:
  - `options == 33 || options == 41`
  - `proofprotocol == 1`
  - All reserves > 0
  - `startblock <= current_height`
- Resolves fee currency names
- Parallel currency lookups (batch processing)

**API Endpoints:**

```rust
get_available_namespaces() -> Vec<NamespaceOption>
get_root_currency(blockchain_id) -> NamespaceOption
get_currency(name) -> GetCurrencyResponse
```

**Data Structures:**

```rust
pub struct NamespaceOption {
    pub name: String,
    pub currency_id: String,
    pub registration_fee: f64,
    pub fully_qualified_name: String,
    pub fee_currency_name: String,
    pub options: u32,
    pub id_referral_levels: u32,
}
```

**Lesson for Explorer**:

- Currency explorer features
- Namespace/currency hierarchy visualization
- Fee calculator
- Currency state tracking

---

## Frontend Integration Pattern

### Tauri Command Invocation

Nymia uses Tauri's `invoke()` API to call Rust backend functions:

```typescript
import { invoke } from '@tauri-apps/api/core';

// Example: Send a message
const txid = await invoke<string>('send_private_message', {
  senderZAddress: '...',
  recipientZAddress: '...',
  memoText: 'Hello!',
  senderIdentity: 'alice@',
  amount: 0.0,
});

// Example: Get identities (fast mode)
const identities = await invoke<FormattedIdentity[]>(
  'get_login_identities_fast'
);

// Example: Get UTXO info
const utxos = await invoke<UtxoInfo>('get_utxo_info', {
  address: 'zs1...',
});
```

### Progressive Loading Pattern

```typescript
// 1. Fast initial load without balances
const identities = await invoke('get_login_identities_fast');
displayIdentities(identities); // Show immediately

// 2. Fetch balances individually
for (const identity of identities) {
  const balance = await invoke('get_identity_balance', {
    privateAddress: identity.private_address,
  });
  updateIdentityBalance(identity.i_address, balance);
}
```

---

## Security Architecture

### Zero-Trust Messaging System

1. **Message Signing (Send)**:

```
Message → Sign with VerusID → Append Signature → Send to Blockchain
```

2. **Message Verification (Receive)**:

```
Receive Message → Extract Signature → Verify with VerusID → Display if Valid
```

3. **No Fallback**:

- Unsigned messages are silently filtered
- Failed verification = message not displayed
- No degraded modes or warnings

**Implementation:**

```rust
// Sending: Mandatory signing
let signature = sign_message(&rpc_user, &rpc_pass, rpc_port,
                            &sender_identity, &base_message).await?;
let full_memo = format!("{}//f//{}//t//{}//{}",
                       message, identity, timestamp, signature);

// Receiving: Strict verification
match verify_message(&rpc_user, &rpc_pass, rpc_port,
                    sender_id, signature, &original).await {
    Ok(true) => return Some((message, sender, timestamp)),
    _ => return None, // Silently filter
}
```

**Lesson for Explorer**:

- Transaction signature verification
- Address ownership proof
- Data authenticity indicators

---

## Error Handling Pattern

### Structured Error Types

```rust
#[derive(Debug, thiserror::Error, Serialize, Clone)]
pub enum VerusRpcError {
    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("RPC error {code}: {message}")]
    Rpc { code: i32, message: String },

    #[error("Failed to parse response: {0}")]
    ParseError(String),

    #[error("RPC call timed out")]
    Timeout,

    #[error("Identity not found or cannot receive private messages")]
    NotFoundOrIneligible,

    #[error("Message signing failed")]
    SigningFailed,

    #[error("Message verification failed")]
    VerificationFailed,
}
```

### Error Propagation

```rust
// Specific error handling for different RPC error codes
match make_rpc_call(...).await {
    Ok(result) => Ok(result),
    Err(e) => match e {
        VerusRpcError::Rpc { code, .. } if code == -5 => {
            // Code -5: Identity not found (expected)
            Ok(false)
        }
        _ => Err(e) // Propagate other errors
    }
}
```

**Lesson for Explorer**:

- More granular error types
- Error code mapping
- User-friendly error messages

---

## Credential Management

### Secure Storage

Uses `tauri-plugin-store` for encrypted credential storage:

```rust
// Save credentials
#[tauri::command]
pub async fn save_credentials(
    app: tauri::AppHandle,
    rpc_user: String,
    rpc_pass: String,
    rpc_port: u16,
) -> Result<(), String>

// Load credentials (used internally by other commands)
pub async fn load_credentials(
    app: tauri::AppHandle
) -> Result<Credentials, CredentialError>
```

### Automatic Blockchain Detection

```rust
#[tauri::command]
pub async fn detect_all_blockchains() -> Result<ParallelDetectionResult, String>
```

Detects:

- Verus (mainnet)
- Verus Testnet
- CHIPS
- vDEX
- vARRR

**Lesson for Explorer**:

- Auto-detect Verus daemon
- Support multiple networks
- Credential persistence

---

## Advanced Features to Learn From

### 1. **UTXO-Aware Fast Transactions**

Nymia tracks UTXO count to enable rapid successive messages:

- Disables send button when `usable_utxos < 2`
- Shows UTXO count to user
- Educates users about UTXO splitting

### 2. **Progressive Data Loading**

- Load UI-critical data first (names)
- Load supplementary data afterward (balances)
- Update UI incrementally

### 3. **Batch Processing**

Namespace resolution processes currencies in batches of 5:

```rust
for batch in valid_currency_infos.chunks(5) {
    let futures = batch.iter().map(|c| resolve_currency(c));
    let results = futures::future::join_all(futures).await;
    // Process results
    tokio::time::sleep(Duration::from_millis(100)).await;
}
```

### 4. **Dynamic Message Limits**

Calculate maximum message length based on:

- Signature length
- VerusID name length
- Protocol overhead

```typescript
const SIGNATURE_LENGTH = 88;
const MEMO_PROTOCOL_OVERHEAD = 10; // "//f////t//"
const MAX_MEMO_BYTES = 512;

function calculateMaxMessageLength(verusIdName: string): number {
  const available =
    MAX_MEMO_BYTES / 2 -
    SIGNATURE_LENGTH -
    verusIdName.length -
    MEMO_PROTOCOL_OVERHEAD;
  return Math.max(0, available - 20); // Safety margin
}
```

### 5. **Polling with Timeouts**

Smart polling for confirmations:

```rust
pub async fn wait_for_confirmations(
    txid: String,
    min_confirmations: u64,
    interval_secs: u64,
    timeout_secs: u64,
) -> Result<bool, String> {
    let start = Instant::now();
    loop {
        let confs = get_transaction_confirmations(txid).await?;
        if confs >= min_confirmations { return Ok(true); }
        if start.elapsed() >= Duration::from_secs(timeout_secs) {
            return Ok(false); // Timeout
        }
        sleep(Duration::from_secs(interval_secs)).await;
    }
}
```

---

## Applicable Features for Your Explorer

### 1. **VerusID Integration**

Add VerusID-specific features:

- ✅ Already have: Basic identity lookup
- 🆕 Add: Identity verification status
- 🆕 Add: Identity creation wizard
- 🆕 Add: Sub-identity tree visualization
- 🆕 Add: Identity transaction history

### 2. **Enhanced Transaction Analysis**

- Parse memo fields for structured data
- Detect message transactions
- Verify signatures for data authenticity
- Show currency conversion details

### 3. **UTXO Analytics**

Add UTXO tracking for addresses:

```typescript
interface UtxoAnalytics {
  total: number;
  spendable: number;
  dust: number;
  distribution: {
    micro: number; // 0.0001-0.001
    small: number; // 0.001-0.01
    medium: number; // 0.01-1
    large: number; // 1+
  };
}
```

### 4. **Namespace/Currency Explorer**

- List all PBaaS currencies
- Show currency reserves
- Display conversion rates
- Track currency state changes

### 5. **Multi-Network Support**

Support switching between:

- Verus Mainnet
- Verus Testnet
- CHIPS
- vDEX
- vARRR

### 6. **Signature Verification Tool**

Add a tool to verify message signatures:

```typescript
// Verify a Verus message signature
async function verifyMessage(
  identity: string,
  message: string,
  signature: string
): Promise<boolean>;
```

---

## Code Quality Lessons

### 1. **Module Organization**

```
src-tauri/src/
├── lib.rs              # Main exports & Tauri commands
├── rpc_client.rs       # Generic RPC client
├── identity_rpc.rs     # Identity operations
├── message_rpc.rs      # Messaging operations
├── wallet_rpc.rs       # Wallet operations
├── namespace_rpc.rs    # Namespace operations
├── credentials.rs      # Credential management
└── settings.rs         # Settings/persistence
```

Clean separation of concerns with dedicated modules.

### 2. **Type Safety**

Strong typing with Rust structs mapped to TypeScript interfaces:

```rust
// Rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FormattedIdentity { ... }

// TypeScript
export interface FormattedIdentity { ... }
```

### 3. **Comprehensive Logging**

```rust
log::info!("Fetching identities...");
log::debug!("Identity {} qualifies", addr);
log::warn!("Balance fetch failed: {:?}", e);
log::error!("RPC call failed: {:?}", e);
```

### 4. **Defensive Programming**

- Check all optional fields
- Validate data before processing
- Handle empty responses gracefully
- Provide sensible defaults

---

## Performance Optimizations

### 1. **Parallel RPC Calls**

```rust
let futures = batch.iter().map(|item| async_operation(item));
let results = futures::future::join_all(futures).await;
```

### 2. **Lazy Loading**

- Load critical data first
- Defer non-essential data
- Update UI progressively

### 3. **Caching Strategy**

Store conversations and messages locally:

```typescript
await invoke('save_conversations', { conversations });
await invoke('save_messages_for_conversation', {
  conversationId,
  messages,
});
```

### 4. **Request Batching**

- Batch similar operations
- Add delays between batches
- Respect RPC rate limits

---

## Comparison with Your RPC Client

### Your Current Implementation (`/lib/rpc-client.ts`)

```typescript
class VerusRpcClient {
  async makeRpcCall<T>(method: string, params: any[]): Promise<T>;
}
```

✅ **Strengths:**

- Clean TypeScript implementation
- Good error handling
- Supports remote daemons
- Configuration flexibility

🆕 **Could Add from Nymia:**

- Structured error types (not just strings)
- Message signing/verification helpers
- UTXO analysis functions
- Identity-specific operations
- Namespace/currency operations

### Suggested Enhancements

1. **Add Identity Module** (`/lib/verus-identity.ts`):

```typescript
export class VerusIdentityClient {
  async getIdentity(name: string): Promise<Identity>;
  async listIdentities(): Promise<Identity[]>;
  async checkIdentityExists(name: string): Promise<boolean>;
  async getIdentityHistory(name: string): Promise<Transaction[]>;
}
```

2. **Add Message Verification** (`/lib/verus-crypto.ts`):

```typescript
export class VerusCrypto {
  async signMessage(identity: string, message: string): Promise<string>;
  async verifyMessage(
    identity: string,
    message: string,
    sig: string
  ): Promise<boolean>;
}
```

3. **Add UTXO Analysis** (`/lib/verus-utxo.ts`):

```typescript
export class VerusUtxoAnalyzer {
  async getUtxoInfo(address: string): Promise<UtxoInfo>;
  async analyzeUtxoDistribution(address: string): Promise<UtxoDistribution>;
}
```

---

## Key Takeaways

### 1. **Modular Architecture**

Separate concerns into dedicated modules rather than monolithic files.

### 2. **Progressive Enhancement**

Load fast first, enhance with details afterward.

### 3. **Zero-Trust Security**

Verify everything, trust nothing, fail safely.

### 4. **User-Friendly Errors**

Map technical errors to user-understandable messages.

### 5. **Performance Through Parallelism**

Use concurrent operations with rate limiting.

### 6. **Type Safety Everywhere**

Strong typing from Rust through TypeScript to UI.

### 7. **Defensive Coding**

Always handle edge cases and missing data.

---

## Implementation Recommendations

### Phase 1: Identity Features (1-2 weeks)

- [ ] Add VerusID lookup to explorer
- [ ] Show identity details page
- [ ] Display identity transaction history
- [ ] Add identity verification status

### Phase 2: Enhanced Transaction Analysis (1 week)

- [ ] Parse memo fields
- [ ] Detect structured messages
- [ ] Show signature verification status
- [ ] Add transaction type classification

### Phase 3: UTXO Analytics (1 week)

- [ ] Add UTXO count display
- [ ] Show UTXO distribution chart
- [ ] Add UTXO health indicators
- [ ] Suggest UTXO consolidation

### Phase 4: Currency/Namespace Explorer (2 weeks)

- [ ] List PBaaS currencies
- [ ] Show currency reserves
- [ ] Display conversion rates
- [ ] Track currency lifecycle

### Phase 5: Multi-Network Support (1 week)

- [ ] Add network switcher
- [ ] Support Testnet
- [ ] Support CHIPS/vDEX/vARRR
- [ ] Auto-detect available networks

---

## Conclusion

Nymia Desktop demonstrates excellent software architecture for Verus blockchain applications:

✅ **Clean module organization**
✅ **Strong type safety**
✅ **Security-first design**
✅ **Performance optimization**
✅ **User experience focus**

While your explorer serves a different purpose (data visualization vs. P2P messaging), many patterns are directly applicable:

1. **API organization**: Modular RPC clients
2. **Identity features**: VerusID integration
3. **Security patterns**: Signature verification
4. **Performance**: Progressive loading, parallelism
5. **User experience**: Clear errors, real-time updates

The most valuable lesson is their **systematic approach** to complex blockchain operations with **reliability and security** as primary concerns.

---

## References

- **Nymia Repository**: https://github.com/Meyse/nymia-desktop
- **Verus RPC API**: https://docs.verus.io/
- **Tauri Framework**: https://tauri.app/
- **Your Explorer**: `/home/build/verus-dapp/`

---

_Document created: 2025-10-08_
_Based on: Nymia Desktop v0.5.4_
