# NEAR Cross-Chain Swap Contracts

This directory contains the NEAR smart contracts for enabling cross-chain swaps between Ethereum and NEAR.

## Architecture

The NEAR implementation follows the same pattern as the Ethereum contracts but is written in Rust using the NEAR SDK.

### Core Components

1. **EscrowFactory** - Creates and manages escrow contracts
2. **Resolver** - Coordinates the cross-chain swap process
3. **Escrow** - Holds funds during the swap process
4. **Types** - Data structures for orders and escrows

## Contract Structure

```
near-contracts/
├── src/
│   ├── lib.rs              # Main contract entry point
│   ├── types.rs            # Data structures
│   ├── escrow_factory.rs   # Escrow factory contract
│   ├── resolver.rs         # Resolver contract
│   └── escrow.rs          # Escrow contract
├── Cargo.toml             # Dependencies
├── deploy.sh              # Deployment script
└── README.md             # This file
```

## Cross-Chain Swap Flow

The NEAR contracts implement the same flow as the Ethereum contracts:

1. **Order Creation** - User creates a cross-chain order
2. **Source Escrow** - Resolver deploys escrow on source chain (ETH)
3. **Destination Escrow** - Resolver deploys escrow on destination chain (NEAR)
4. **Fund Withdrawal** - Both parties withdraw using shared secret
5. **Completion** - Swap is completed atomically

## Key Features

- **Hash Lock Security** - Secret-based locking mechanism
- **Time Locks** - Configurable timeouts for security
- **Atomic Swaps** - Both sides succeed or both fail
- **Cancellation Support** - Time-based cancellation if needed

## Deployment

### Prerequisites

1. Install NEAR CLI: `npm install -g near-cli`
2. Install Rust and wasm32 target: `rustup target add wasm32-unknown-unknown`
3. Create a NEAR testnet account

### Deploy to Testnet

```bash
# Update the deploy.sh script with your account details
# Then run:
./deploy.sh
```

### Manual Deployment

```bash
# Build contracts
cargo build --target wasm32-unknown-unknown --release

# Create accounts
near create-account escrow-factory.testnet --masterAccount your-account.testnet
near create-account resolver.testnet --masterAccount your-account.testnet

# Deploy contracts
near deploy --accountId escrow-factory.testnet --wasmFile target/wasm32-unknown-unknown/release/near_cross_chain_swap.wasm
near deploy --accountId resolver.testnet --wasmFile target/wasm32-unknown-unknown/release/near_cross_chain_swap.wasm

# Initialize contracts
near call escrow-factory.testnet new '{"owner_id": "your-account.testnet"}' --accountId your-account.testnet
near call resolver.testnet new '{"owner_id": "your-account.testnet", "escrow_factory_id": "escrow-factory.testnet"}' --accountId your-account.testnet
```

## Testing

The contracts are tested using the TypeScript test suite in `../tests/eth-near.spec.ts` which follows the same pattern as the original ETH ↔ BSC tests.

## Security Considerations

- **Secret Management** - Secrets must be securely generated and shared
- **Time Lock Configuration** - Proper timeouts prevent fund locking
- **Access Control** - Only authorized resolvers can deploy escrows
- **Gas Optimization** - NEAR gas costs are different from Ethereum

## Integration with Ethereum

The NEAR contracts work in conjunction with Ethereum contracts to enable cross-chain swaps. The resolver coordinates between both chains to ensure atomic execution.

## Differences from Ethereum Implementation

1. **Account Model** - NEAR uses account-based vs Ethereum's address-based
2. **Gas Model** - Different gas pricing and limits
3. **Storage** - NEAR has different storage costs and patterns
4. **Cross-Chain Communication** - Requires bridge/messaging protocol 