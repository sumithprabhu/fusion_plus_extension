#!/bin/bash

# NEAR Contract Deployment Script
# This script deploys the cross-chain swap contracts to NEAR testnet

set -e

# Configuration
NETWORK_ID="testnet"
MASTER_ACCOUNT="your-account.testnet"
ESCROW_FACTORY_ACCOUNT="escrow-factory.testnet"
RESOLVER_ACCOUNT="resolver.testnet"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Deploying NEAR Cross-Chain Swap Contracts${NC}"

# Check if near-cli is installed
if ! command -v near &> /dev/null; then
    echo -e "${RED}Error: near-cli is not installed. Please install it first.${NC}"
    exit 1
fi

# Build the contracts
echo -e "${YELLOW}Building contracts...${NC}"
cd near-contracts
cargo build --target wasm32-unknown-unknown --release

# Create subaccounts if they don't exist
echo -e "${YELLOW}Creating subaccounts...${NC}"

# Create escrow factory account
near create-account $ESCROW_FACTORY_ACCOUNT --masterAccount $MASTER_ACCOUNT --networkId $NETWORK_ID

# Create resolver account
near create-account $RESOLVER_ACCOUNT --masterAccount $MASTER_ACCOUNT --networkId $NETWORK_ID

# Deploy escrow factory
echo -e "${YELLOW}Deploying EscrowFactory...${NC}"
near deploy --accountId $ESCROW_FACTORY_ACCOUNT --wasmFile target/wasm32-unknown-unknown/release/near_cross_chain_swap.wasm --networkId $NETWORK_ID

# Initialize escrow factory
near call $ESCROW_FACTORY_ACCOUNT new '{"owner_id": "'$MASTER_ACCOUNT'"}' --accountId $MASTER_ACCOUNT --networkId $NETWORK_ID

# Deploy resolver
echo -e "${YELLOW}Deploying Resolver...${NC}"
near deploy --accountId $RESOLVER_ACCOUNT --wasmFile target/wasm32-unknown-unknown/release/near_cross_chain_swap.wasm --networkId $NETWORK_ID

# Initialize resolver
near call $RESOLVER_ACCOUNT new '{"owner_id": "'$MASTER_ACCOUNT'", "escrow_factory_id": "'$ESCROW_FACTORY_ACCOUNT'"}' --accountId $MASTER_ACCOUNT --networkId $NETWORK_ID

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}EscrowFactory: $ESCROW_FACTORY_ACCOUNT${NC}"
echo -e "${GREEN}Resolver: $RESOLVER_ACCOUNT${NC}" 