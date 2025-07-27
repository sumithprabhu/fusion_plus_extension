use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{
    env, ext_contract, near_bindgen, AccountId, Gas, PanicOnDefault, Promise, PromiseResult,
};
use crate::types::Balance;

use crate::types::{CrossChainOrder, EscrowImmutables, TimeLocks};

const GAS_FOR_ESCROW_CREATION: Gas = Gas::from_tgas(50);

#[ext_contract(ext_escrow)]
pub trait Escrow {
    fn new(immutables: EscrowImmutables) -> Self;
    fn withdraw(&mut self, secret: String);
    fn cancel(&mut self);
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct EscrowFactory {
    pub owner_id: AccountId,
    pub escrows: std::collections::HashMap<AccountId, EscrowImmutables>,
    pub escrow_counter: u64,
}

#[near_bindgen]
impl EscrowFactory {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        Self {
            owner_id,
            escrows: std::collections::HashMap::new(),
            escrow_counter: 0,
        }
    }

    pub fn create_src_escrow(
        &mut self,
        order: CrossChainOrder,
        time_locks: TimeLocks,
        taker: AccountId,
        amount: Balance,
        secret_hash: String,
    ) -> AccountId {
        assert_eq!(env::predecessor_account_id(), self.owner_id, "Only owner can create escrows");

        let immutables = EscrowImmutables::new(order, time_locks, taker, amount);
        let escrow_id = format!("escrow_{}.{}", self.escrow_counter, env::current_account_id());
        let escrow_account_id: AccountId = escrow_id.parse().unwrap();

        self.escrows.insert(escrow_account_id.clone(), immutables.clone());
        self.escrow_counter += 1;

        // Create escrow contract
        Promise::new(escrow_account_id.clone())
            .create_account()
            .transfer(amount + env::attached_deposit())
            .deploy_contract(include_bytes!("../res/escrow.wasm").to_vec())
            .function_call(
                "new".to_string(),
                immutables.try_to_vec().unwrap(),
                0,
                GAS_FOR_ESCROW_CREATION,
            );

        escrow_account_id
    }

    pub fn create_dst_escrow(
        &mut self,
        immutables: EscrowImmutables,
    ) -> AccountId {
        assert_eq!(env::predecessor_account_id(), self.owner_id, "Only owner can create escrows");

        let escrow_id = format!("escrow_{}.{}", self.escrow_counter, env::current_account_id());
        let escrow_account_id: AccountId = escrow_id.parse().unwrap();

        let mut updated_immutables = immutables.clone();
        updated_immutables.deployed_at = env::block_timestamp();

        self.escrows.insert(escrow_account_id.clone(), updated_immutables.clone());
        self.escrow_counter += 1;

        // Create escrow contract
        Promise::new(escrow_account_id.clone())
            .create_account()
            .transfer(immutables.amount + env::attached_deposit())
            .deploy_contract(include_bytes!("../res/escrow.wasm").to_vec())
            .function_call(
                "new".to_string(),
                updated_immutables.try_to_vec().unwrap(),
                0,
                GAS_FOR_ESCROW_CREATION,
            );

        escrow_account_id
    }

    pub fn get_escrow(&self, escrow_id: AccountId) -> Option<EscrowImmutables> {
        self.escrows.get(&escrow_id).cloned()
    }

    pub fn get_escrow_counter(&self) -> u64 {
        self.escrow_counter
    }
} 