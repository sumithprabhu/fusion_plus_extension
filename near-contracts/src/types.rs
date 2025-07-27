use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{AccountId, Timestamp};

pub type Balance = u128;

#[derive(BorshDeserialize, BorshSerialize, serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct CrossChainOrder {
    pub maker: AccountId,
    pub making_amount: Balance,
    pub taking_amount: Balance,
    pub maker_asset: AccountId,
    pub taker_asset: AccountId,
    pub salt: u64,
    pub nonce: u64,
    pub src_chain_id: u64,
    pub dst_chain_id: u64,
    pub src_safety_deposit: Balance,
    pub dst_safety_deposit: Balance,
    pub allow_partial_fills: bool,
    pub allow_multiple_fills: bool,
}

#[derive(BorshDeserialize, BorshSerialize, serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct TimeLocks {
    pub src_withdrawal: u64,
    pub src_public_withdrawal: u64,
    pub src_cancellation: u64,
    pub src_public_cancellation: u64,
    pub dst_withdrawal: u64,
    pub dst_public_withdrawal: u64,
    pub dst_cancellation: u64,
}

#[derive(BorshDeserialize, BorshSerialize, serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct EscrowImmutables {
    pub order: CrossChainOrder,
    pub time_locks: TimeLocks,
    pub deployed_at: Timestamp,
    pub taker: AccountId,
    pub amount: Balance,
}

#[derive(BorshDeserialize, BorshSerialize, serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct EscrowState {
    pub immutables: EscrowImmutables,
    pub is_withdrawn: bool,
    pub is_cancelled: bool,
    pub secret_hash: String,
}

impl EscrowImmutables {
    pub fn new(
        order: CrossChainOrder,
        time_locks: TimeLocks,
        taker: AccountId,
        amount: Balance,
    ) -> Self {
        Self {
            order,
            time_locks,
            deployed_at: 0, // Will be set when deployed
            taker,
            amount,
        }
    }

    pub fn with_deployed_at(mut self, deployed_at: Timestamp) -> Self {
        self.deployed_at = deployed_at;
        self
    }
} 