# Cross-Chain Resolver Example

This project demonstrates cross-chain swaps between different blockchain networks using the 1inch cross-chain SDK.

## Supported Networks

- **ETH ↔ BSC** - Ethereum to Binance Smart Chain (original example)
- **ETH ↔ NEAR** - Ethereum to NEAR Protocol (new implementation)

## Project Structure

```
cross-chain-resolver-example/
├── contracts/                 # Ethereum/Solidity contracts
│   ├── src/
│   │   ├── Resolver.sol      # Ethereum resolver contract
│   │   └── TestEscrowFactory.sol
│   └── lib/
├── near-contracts/           # NEAR/Rust contracts
│   ├── src/
│   │   ├── lib.rs           # Main contract entry point
│   │   ├── types.rs         # Data structures
│   │   ├── escrow_factory.rs # Escrow factory contract
│   │   ├── resolver.rs      # Resolver contract
│   │   └── escrow.rs        # Escrow contract
│   ├── Cargo.toml           # Rust dependencies
│   ├── deploy.sh            # NEAR deployment script
│   └── README.md            # NEAR-specific documentation
├── tests/
│   ├── main.spec.ts         # ETH ↔ BSC tests (original)
│   ├── eth-near.spec.ts     # ETH ↔ NEAR tests (new)
│   ├── near/                # NEAR test utilities
│   │   ├── config.ts        # NEAR configuration
│   │   ├── wallet.ts        # NEAR wallet utilities
│   │   └── resolver.ts      # NEAR resolver utilities
│   ├── config.ts            # ETH/BSC configuration
│   ├── wallet.ts            # ETH wallet utilities
│   ├── resolver.ts          # ETH resolver utilities
│   └── escrow-factory.ts    # ETH escrow factory utilities
├── package.json
└── README.md               # This file
```

## Cross-Chain Swap Flow

Both implementations follow the same atomic swap pattern:

1. **Order Creation** - User creates a cross-chain order with a secret
2. **Source Escrow** - Resolver deploys escrow on source chain
3. **Destination Escrow** - Resolver deploys escrow on destination chain
4. **Fund Withdrawal** - Both parties withdraw using shared secret
5. **Completion** - Swap is completed atomically

### Security Features

- **Hash Lock Security** - Secret-based locking mechanism
- **Time Locks** - Configurable timeouts for security
- **Atomic Swaps** - Both sides succeed or both fail
- **Cancellation Support** - Time-based cancellation if needed

## Getting Started

### Prerequisites

1. **For ETH ↔ BSC:**
   - Node.js 22+
   - Foundry
   - Access to Ethereum and BSC testnets

2. **For ETH ↔ NEAR:**
   - Node.js 22+
   - Rust and wasm32 target: `rustup target add wasm32-unknown-unknown`
   - NEAR CLI: `npm install -g near-cli`
   - NEAR testnet account

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd cross-chain-resolver-example

# Install dependencies
npm install

# Install Rust dependencies (for NEAR contracts)
cd near-contracts
cargo build --target wasm32-unknown-unknown --release
cd ..
```

### Environment Setup

Create a `.env` file with the following variables:

```env
# For ETH ↔ BSC tests
SRC_CHAIN_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
DST_CHAIN_RPC=https://bsc-testnet.public.blastapi.io
SRC_CHAIN_CREATE_FORK=true
DST_CHAIN_CREATE_FORK=true

# For ETH ↔ NEAR tests
ETH_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEAR_RPC_URL=https://rpc.testnet.near.org
NEAR_NETWORK_ID=testnet
NEAR_MASTER_ACCOUNT=your-account.testnet
NEAR_PRIVATE_KEY=ed25519:YOUR_PRIVATE_KEY
ETH_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
```

### Running Tests

#### ETH ↔ BSC Tests (Original)

```bash
# Run the original ETH ↔ BSC tests
npm test
```

#### ETH ↔ NEAR Tests (New)

```bash
# Deploy NEAR contracts first
npm run deploy:near

# Run ETH ↔ NEAR tests
npm run test:eth-near
```

## Contract Deployment

### Ethereum Contracts

```bash
# Build and deploy Ethereum contracts
forge build
forge script script/Deploy.s.sol --rpc-url <RPC_URL> --broadcast
```

### NEAR Contracts

```bash
# Deploy NEAR contracts to testnet
cd near-contracts
./deploy.sh
```

## Architecture Differences

### ETH ↔ BSC (EVM ↔ EVM)
- Same contract structure on both chains
- Shared SDK and tooling
- Similar transaction patterns
- Direct contract calls between chains

### ETH ↔ NEAR (EVM ↔ Non-EVM)
- Different contract languages (Solidity vs Rust)
- Different SDKs (ethers.js vs near-api-js)
- Different account models (address-based vs account-based)
- Requires bridge/messaging protocol for cross-chain communication

## Key Implementation Details

### Hash Lock Mechanism
```typescript
// Generate secret
const secret = randomBytes(32).toString('hex')

// Use secret to lock funds on both chains
// Only someone with the secret can withdraw
```

### Time Lock Configuration
```typescript
const timeLocks = {
    srcWithdrawal: 10,        // 10s finality lock
    srcPublicWithdrawal: 120,  // 2m private withdrawal
    srcCancellation: 121,      // 1s public withdrawal
    // ... more timeouts
}
```

### Cross-Chain Coordination
The resolver contracts coordinate between chains to ensure:
- Atomic execution (both succeed or both fail)
- Proper secret sharing
- Time lock enforcement
- Fund safety

## Security Considerations

1. **Secret Management** - Secrets must be securely generated and shared
2. **Time Lock Configuration** - Proper timeouts prevent fund locking
3. **Access Control** - Only authorized resolvers can deploy escrows
4. **Cross-Chain Communication** - Bridge security is critical for ETH ↔ NEAR
5. **Gas Optimization** - Different gas models between chains

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.
