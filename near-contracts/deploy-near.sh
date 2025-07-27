#!/bin/bash

# NEAR Contract Deployment Script for ETH ↔ NEAR Cross-Chain Swap
# This script deploys the cross-chain swap contracts to NEAR testnet

set -e

# Configuration
NETWORK_ID="testnet"
MASTER_ACCOUNT="your-account.testnet"  # Change this to your NEAR account
ESCROW_FACTORY_ACCOUNT="escrow-factory.testnet"
RESOLVER_ACCOUNT="resolver.testnet"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Deploying NEAR Cross-Chain Swap Contracts for ETH ↔ NEAR${NC}"

# Check if near-cli is installed
if ! command -v near &> /dev/null; then
    echo -e "${RED}Error: near-cli is not installed. Please install it first.${NC}"
    echo "Install with: npm install -g near-cli"
    exit 1
fi

# Check if user is logged in
if ! near whoami &> /dev/null; then
    echo -e "${RED}Error: You are not logged in to NEAR. Please login first.${NC}"
    echo "Login with: near login"
    exit 1
fi

# Get the current account
CURRENT_ACCOUNT=$(near whoami)
echo -e "${YELLOW}Current NEAR account: ${CURRENT_ACCOUNT}${NC}"

# Build the contracts
echo -e "${YELLOW}Building contracts...${NC}"
cd near-contracts
cargo build --target wasm32-unknown-unknown --release

# Check if build was successful
if [ ! -f "target/wasm32-unknown-unknown/release/near_cross_chain_swap.wasm" ]; then
    echo -e "${RED}Error: Contract build failed. Please fix compilation errors first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contract built successfully!${NC}"

# Create subaccounts if they don't exist
echo -e "${YELLOW}Creating subaccounts...${NC}"

# Create escrow factory account
echo "Creating escrow factory account: ${ESCROW_FACTORY_ACCOUNT}"
near create-account $ESCROW_FACTORY_ACCOUNT --masterAccount $CURRENT_ACCOUNT --networkId $NETWORK_ID

# Create resolver account
echo "Creating resolver account: ${RESOLVER_ACCOUNT}"
near create-account $RESOLVER_ACCOUNT --masterAccount $CURRENT_ACCOUNT --networkId $NETWORK_ID

# Deploy escrow factory
echo -e "${YELLOW}Deploying EscrowFactory...${NC}"
near deploy --accountId $ESCROW_FACTORY_ACCOUNT --wasmFile target/wasm32-unknown-unknown/release/near_cross_chain_swap.wasm --networkId $NETWORK_ID

# Initialize escrow factory
echo "Initializing escrow factory..."
near call $ESCROW_FACTORY_ACCOUNT new '{"owner_id": "'$CURRENT_ACCOUNT'"}' --accountId $CURRENT_ACCOUNT --networkId $NETWORK_ID

# Deploy resolver
echo -e "${YELLOW}Deploying Resolver...${NC}"
near deploy --accountId $RESOLVER_ACCOUNT --wasmFile target/wasm32-unknown-unknown/release/near_cross_chain_swap.wasm --networkId $NETWORK_ID

# Initialize resolver
echo "Initializing resolver..."
near call $RESOLVER_ACCOUNT new '{"owner_id": "'$CURRENT_ACCOUNT'", "escrow_factory_id": "'$ESCROW_FACTORY_ACCOUNT'"}' --accountId $CURRENT_ACCOUNT --networkId $NETWORK_ID

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}EscrowFactory: $ESCROW_FACTORY_ACCOUNT${NC}"
echo -e "${GREEN}Resolver: $RESOLVER_ACCOUNT${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update your .env file with these contract addresses"
echo "2. Run the ETH ↔ NEAR tests"
echo ""
echo -e "${YELLOW}Contract addresses for .env:${NC}"
echo "NEAR_ESCROW_FACTORY=$ESCROW_FACTORY_ACCOUNT"
echo "NEAR_RESOLVER=$RESOLVER_ACCOUNT" 