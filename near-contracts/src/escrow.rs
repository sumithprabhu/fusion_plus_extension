use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{
    env, ext_contract, near_bindgen, AccountId, Balance, Gas, PanicOnDefault, Promise, PromiseResult,
};

use crate::types::{EscrowImmutables, EscrowState};

const GAS_FOR_FT_TRANSFER: Gas = Gas(10_000_000_000_000);

#[ext_contract(ext_ft)]
pub trait FungibleToken {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: String, memo: Option<String>);
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Escrow {
    pub state: EscrowState,
}

#[near_bindgen]
impl Escrow {
    #[init]
    pub fn new(immutables: EscrowImmutables) -> Self {
        let mut immutables_with_timestamp = immutables.clone();
        immutables_with_timestamp.deployed_at = env::block_timestamp();

        Self {
            state: EscrowState {
                immutables: immutables_with_timestamp,
                is_withdrawn: false,
                is_cancelled: false,
                secret_hash: String::new(), // Will be set when needed
            },
        }
    }

    pub fn withdraw(&mut self, secret: String) {
        assert!(!self.state.is_withdrawn, "Already withdrawn");
        assert!(!self.state.is_cancelled, "Already cancelled");

        // Verify time locks
        let current_timestamp = env::block_timestamp();
        let deployed_at = self.state.immutables.deployed_at;
        let withdrawal_time = deployed_at + self.state.immutables.time_locks.src_withdrawal * 1_000_000_000;

        assert!(current_timestamp >= withdrawal_time, "Withdrawal time lock not passed");

        // Verify secret hash (in real implementation, you'd hash the secret and compare)
        // For now, we'll just accept any non-empty secret
        assert!(!secret.is_empty(), "Invalid secret");

        self.state.is_withdrawn = true;

        // Transfer funds to taker
        let taker = self.state.immutables.taker.clone();
        let amount = self.state.immutables.amount;

        // Transfer NEAR
        Promise::new(taker).transfer(amount);

        // If it's a token transfer, you'd call the token contract
        // ext_ft::ft_transfer(
        //     taker,
        //     amount.to_string(),
        //     Some("Cross-chain swap withdrawal".to_string()),
        //     &self.state.immutables.order.taker_asset,
        //     0,
        //     GAS_FOR_FT_TRANSFER,
        // );
    }

    pub fn cancel(&mut self) {
        assert!(!self.state.is_withdrawn, "Already withdrawn");
        assert!(!self.state.is_cancelled, "Already cancelled");

        // Verify time locks for cancellation
        let current_timestamp = env::block_timestamp();
        let deployed_at = self.state.immutables.deployed_at;
        let cancellation_time = deployed_at + self.state.immutables.time_locks.src_cancellation * 1_000_000_000;

        assert!(current_timestamp >= cancellation_time, "Cancellation time lock not passed");

        self.state.is_cancelled = true;

        // Return funds to maker
        let maker = self.state.immutables.order.maker.clone();
        let amount = self.state.immutables.amount;

        // Transfer NEAR back to maker
        Promise::new(maker).transfer(amount);

        // If it's a token transfer, you'd call the token contract
        // ext_ft::ft_transfer(
        //     maker,
        //     amount.to_string(),
        //     Some("Cross-chain swap cancellation".to_string()),
        //     &self.state.immutables.order.maker_asset,
        //     0,
        //     GAS_FOR_FT_TRANSFER,
        // );
    }

    pub fn get_state(&self) -> EscrowState {
        self.state.clone()
    }

    pub fn get_immutables(&self) -> EscrowImmutables {
        self.state.immutables.clone()
    }
} 