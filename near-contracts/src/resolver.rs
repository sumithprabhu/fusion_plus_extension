use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{
    env, ext_contract, near_bindgen, AccountId, Gas, PanicOnDefault, Promise, PromiseResult,
};
use crate::types::Balance;

use crate::types::{CrossChainOrder, EscrowImmutables, TimeLocks};

const GAS_FOR_ESCROW_CALL: Gas = Gas::from_tgas(20);

#[ext_contract(ext_escrow_factory)]
pub trait EscrowFactory {
    fn create_src_escrow(
        &mut self,
        order: CrossChainOrder,
        time_locks: TimeLocks,
        taker: AccountId,
        amount: Balance,
        secret_hash: String,
    ) -> AccountId;
    
    fn create_dst_escrow(&mut self, immutables: EscrowImmutables) -> AccountId;
}

#[ext_contract(ext_escrow)]
pub trait Escrow {
    fn withdraw(&mut self, secret: String);
    fn cancel(&mut self);
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Resolver {
    pub owner_id: AccountId,
    pub escrow_factory_id: AccountId,
    pub src_chain_id: u64,
    pub dst_chain_id: u64,
}

#[near_bindgen]
impl Resolver {
    #[init]
    pub fn new(owner_id: AccountId, escrow_factory_id: AccountId) -> Self {
        Self {
            owner_id,
            escrow_factory_id,
            src_chain_id: 1, // Ethereum
            dst_chain_id: 1313161554, // NEAR testnet
        }
    }

    pub fn deploy_src(
        &mut self,
        order: CrossChainOrder,
        time_locks: TimeLocks,
        taker: AccountId,
        amount: Balance,
        secret_hash: String,
    ) -> Promise {
        assert_eq!(env::predecessor_account_id(), self.owner_id, "Only owner can deploy");

        ext_escrow_factory::create_src_escrow(
            order,
            time_locks,
            taker,
            amount,
            secret_hash,
            &self.escrow_factory_id,
            0,
            GAS_FOR_ESCROW_CALL,
        )
    }

    pub fn deploy_dst(&mut self, immutables: EscrowImmutables) -> Promise {
        assert_eq!(env::predecessor_account_id(), self.owner_id, "Only owner can deploy");

        ext_escrow_factory::create_dst_escrow(
            immutables,
            &self.escrow_factory_id,
            0,
            GAS_FOR_ESCROW_CALL,
        )
    }

    pub fn withdraw(&mut self, escrow_id: AccountId, secret: String) -> Promise {
        assert_eq!(env::predecessor_account_id(), self.owner_id, "Only owner can withdraw");

        ext_escrow::withdraw(
            secret,
            &escrow_id,
            0,
            GAS_FOR_ESCROW_CALL,
        )
    }

    pub fn cancel(&mut self, escrow_id: AccountId) -> Promise {
        assert_eq!(env::predecessor_account_id(), self.owner_id, "Only owner can cancel");

        ext_escrow::cancel(
            &escrow_id,
            0,
            GAS_FOR_ESCROW_CALL,
        )
    }

    pub fn get_owner(&self) -> AccountId {
        self.owner_id.clone()
    }

    pub fn get_escrow_factory(&self) -> AccountId {
        self.escrow_factory_id.clone()
    }
} 