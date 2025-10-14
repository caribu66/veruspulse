# Verus RPC API Reference

This document contains all available Verus RPC methods extracted from the official VerusCoin GitHub repository.

## Standard Blockchain RPC Methods

### Core Blockchain Operations

- **getbestblockhash**: Returns the hash of the best (tip) block in the longest blockchain
- **getblock**: Returns block data by hash or height
- **getblockchaininfo**: Returns an object containing various state info regarding blockchain processing
- **getblockcount**: Returns the number of blocks in the longest blockchain
- **getblockdeltas**: Returns block deltas (changes) for a block
- **getblockhash**: Returns hash of block in best-block-chain at height provided
- **getblockhashes**: Returns array of hashes of blocks within the timestamp range provided
- **getblockheader**: Returns block header info
- **getchaintips**: Returns information about all known tips in the block tree
- **getdifficulty**: Returns the proof-of-work difficulty as a multiple of the minimum difficulty

### Memory Pool Operations

- **getmempoolinfo**: Returns details on the active state of the TX memory pool
- **getrawmempool**: Returns all transaction ids in memory pool
- **getspentinfo**: Returns the txid and index where an output is spent
- **gettxout**: Returns details about an unspent transaction output
- **gettxoutsetinfo**: Returns statistics about the unspent transaction output set

### Blockchain Utilities

- **pruneblockchain**: Prunes the blockchain up to a certain height
- **verifychain**: Verifies blockchain database
- **gettxoutproof**: Returns a hex-encoded proof that a txid was included in a block
- **verifytxoutproof**: Returns the txid(s) in the block that the proof is for

## Raw Transaction RPC Methods

### Transaction Creation & Management

- **createrawtransaction**: Creates a transaction spending the given inputs and creating new outputs
- **decoderawtransaction**: Returns a JSON object representing the serialized, hex-encoded transaction
- **decodescript**: Decodes a hex-encoded script
- **getrawtransaction**: Returns raw transaction data
- **sendrawtransaction**: Submits raw transaction (serialized, hex-encoded) to local node and network
- **signrawtransaction**: Signs inputs for raw transaction (serialized, hex-encoded)

## Mining RPC Methods

### Mining Operations

- **getblocktemplate**: Returns data needed to construct a block to work on
- **getlocalsolps**: Returns the average local solutions per second
- **getmininginfo**: Returns a JSON object containing mining-related information
- **getnetworkhashps**: Returns the estimated network hashes per second
- **getnetworksolps**: Returns the estimated network solutions per second
- **prioritisetransaction**: Adds virtual priority or fee to a transaction
- **submitblock**: Attempts to submit new block to network

## Wallet RPC Methods

### Account Management (Deprecated)

- **getaccount**: Returns the account associated with the given address (DEPRECATED)
- **getaccountaddress**: Returns the current address for receiving payments to this account (DEPRECATED)
- **getaddressesbyaccount**: Returns the list of addresses for the given account (DEPRECATED)
- **getreceivedbyaccount**: Returns the total amount received by addresses with account in confirmed transactions (DEPRECATED)
- **listaccounts**: Returns Object that has account names as keys, account balances as values (DEPRECATED)
- **listreceivedbyaccount**: List balances by account (DEPRECATED)
- **move**: Moves a specified amount from one account in your wallet to another (DEPRECATED)
- **sendfrom**: Send an amount from an account to a given address (DEPRECATED)
- **setaccount**: Sets the account associated with the given address (DEPRECATED)

### Address Management

- **addmultisigaddress**: Adds a multisignature address to the wallet
- **getnewaddress**: Returns a new address for receiving payments
- **getrawchangeaddress**: Returns a new address, for receiving change
- **listaddressgroupings**: Lists groups of addresses which have had their common ownership made public

### Balance & Transaction Info

- **getbalance**: Returns the server's total available balance
- **getreceivedbyaddress**: Returns the total amount received by the given address in confirmed transactions
- **gettransaction**: Gets detailed information about in-wallet transaction
- **getunconfirmedbalance**: Returns the server's total unconfirmed balance
- **getwalletinfo**: Returns an object containing various wallet state info
- **listreceivedbyaddress**: List balances by receiving address
- **listsinceblock**: Gets all transactions in blocks since block [blockhash]
- **listtransactions**: Returns up to 'count' most recent transactions skipping the first 'from' transactions for account 'account'
- **listunspent**: Returns array of unspent transaction outputs

### Transaction Operations

- **abandontransaction**: Marks in-wallet transaction as abandoned
- **sendmany**: Send multiple times. Amounts are double-precision floating point numbers
- **sendtoaddress**: Send an amount to a given address
- **resendwallettransactions**: Re-broadcast unconfirmed wallet transactions to all peers

### Wallet Security & Import/Export

- **backupwallet**: Safely copies current wallet file to destination
- **dumpprivkey**: Reveals the private key corresponding to an address
- **dumpwallet**: Dumps all wallet keys in a human-readable format
- **encryptwallet**: Encrypts the wallet with a passphrase
- **importaddress**: Adds an address or script that can be watched as if it were in your wallet
- **importprivkey**: Adds a private key to your wallet
- **importwallet**: Imports keys from a wallet dump file
- **signmessage**: Sign a message with the private key of an address

### Wallet Management

- **keypoolrefill**: Refills the keypool
- **listlockunspent**: Returns list of temporarily unspendable outputs
- **lockunspent**: Updates list of temporarily unspendable outputs
- **settxfee**: Set the transaction fee per kB
- **walletlock**: Removes the wallet encryption key from memory, locking the wallet
- **walletpassphrase**: Stores the wallet decryption key in memory for 'timeout' seconds
- **walletpassphrasechange**: Changes the wallet passphrase from 'oldpassphrase' to 'newpassphrase'

## Network/Control RPC Methods

### Network Management

- **addnode**: Attempts to add or remove a node from the addnode list
- **disconnectnode**: Immediately disconnects from the specified node
- **getaddednodeinfo**: Returns information about the given added node
- **getconnectioncount**: Returns the number of connections to other nodes
- **getnettotals**: Returns information about network traffic
- **getnetworkinfo**: Returns an object containing various state info regarding P2P networking
- **getpeerinfo**: Returns data about each connected network node
- **ping**: Requests that a ping be sent to all other nodes
- **setnetworkactive**: Disable/enable all p2p network activity

### Network Security

- **listbanned**: Lists all banned IPs/Subnets
- **setban**: Attempts to add or remove an IP/Subnet from the banned list
- **clearbanned**: Attempts to clear all banned IPs/Subnets

### System Information

- **getdeprecationinfo**: Returns an object containing current version and deprecation block height
- **getinfo**: Returns an object containing various state info (DEPRECATED, use getblockchaininfo/getnetworkinfo/getwalletinfo)
- **help**: Lists all available public RPC commands, or gets help for a command
- **stop**: Requests a graceful shutdown of the node
- **uptime**: Returns the total uptime of the server

## Verus-Specific Identity RPC Methods

### Identity Registration & Management

- **registernamecommitment**: Registers a name commitment for identity creation
- **registeridentity**: Registers a new identity
- **updateidentity**: Updates an existing identity
- **revokeidentity**: Revokes an identity
- **setidentitytimelock**: Sets a timelock on an identity
- **recoveridentity**: Recovers a revoked identity

### Identity Information Retrieval

- **getidentity**: Retrieves details about a specific identity
- **getidentityhistory**: Gets the history of an identity
- **getidentitycontent**: Retrieves content associated with an identity
- **listidentities**: Lists identities matching criteria
- **getidentitieswithaddress**: Lists identities associated with an address
- **getidentitieswithrevocation**: Lists identities with revocation authority
- **getidentitieswithrecovery**: Lists identities with recovery authority

### Identity Trust Management

- **setidentitytrust**: Sets trust level for an identity
- **getidentitytrust**: Gets trust level for an identity

## Verus-Specific Multi-Chain/Currency RPC Methods

### Currency Trust & Conversion

- **setcurrencytrust**: Sets trust for a currency
- **getcurrencytrust**: Gets trust for a currency
- **estimateconversion**: Estimates the result of a currency conversion

### Currency Definition & Information

- **definecurrency**: Defines a new currency or token
- **listcurrencies**: Lists currencies matching criteria
- **getcurrencyconverters**: Gets converters for a currency
- **getcurrency**: Retrieves details about a specific currency
- **getreservedeposits**: Gets reserve deposits for a currency

### PBaaS & Cross-Chain Operations

- **getnotarizationdata**: Gets notarization data for a chain
- **getlaunchinfo**: Gets launch information for a PBaaS chain
- **getbestproofroot**: Gets the best proof root
- **submitacceptednotarization**: Submits an accepted notarization
- **submitchallenges**: Submits challenges to a notarization
- **getnotarizationproofs**: Gets proofs for a notarization
- **submitimports**: Submits import data
- **getinitialcurrencystate**: Gets the initial state of a currency
- **getcurrencystate**: Gets the current state of a currency
- **getsaplingtree**: Gets the Sapling tree state

### Currency Transactions & Transfers

- **sendcurrency**: Sends currency (supports conversions and cross-chain)
- **getpendingtransfers**: Gets pending cross-chain transfers
- **getexports**: Gets export data
- **getlastimportfrom**: Gets the last import from a chain
- **getimports**: Gets import data
- **refundfailedlaunch**: Refunds a failed currency launch

### Cross-Chain Mining

- **addmergedblock**: Adds a merged block for cross-chain mining
- **submitmergedblock**: Submits a merged block

## Verus-Specific Marketplace RPC Methods

### Offer Management

- **makeoffer**: Creates an offer in the marketplace
- **takeoffer**: Accepts an offer
- **getoffers**: Retrieves offers for an identity or currency
- **listopenoffers**: Lists open offers
- **closeoffers**: Closes offers

## Best Practices for RPC Calls

### Rate Limiting

- Implement client-side rate limiting to avoid overwhelming the Verus daemon
- Use exponential backoff for retry logic
- Batch requests when possible to reduce network overhead

### Error Handling

- Always handle RPC errors gracefully
- Implement proper timeout mechanisms
- Log RPC failures for debugging

### Performance Optimization

- Cache frequently accessed data locally
- Use appropriate RPC methods for your use case
- Avoid polling methods that can be replaced with event-driven approaches

### Security

- Use secure RPC connections (HTTPS/WSS)
- Implement proper authentication
- Validate all RPC responses before processing

## Implementation Notes

This API reference should be used in conjunction with:

- TypeScript type definitions for type safety
- Rate limiting middleware
- Error handling utilities
- Caching strategies

For detailed parameter and response schemas, refer to the official Verus documentation or use the `help` RPC method with the Verus daemon.
