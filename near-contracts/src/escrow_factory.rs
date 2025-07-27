use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault};
use near_sdk::serde::{Deserialize, Serialize};

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
pub struct CrossChainOrder {
    pub maker: AccountId,
    pub making_amount: u128,
    pub taking_amount: u128,
    pub maker_asset: AccountId,
    pub taker_asset: AccountId,
    pub salt: u64,
    pub nonce: u64,
    pub src_chain_id: u64,
    pub dst_chain_id: u64,
    pub src_safety_deposit: u128,
    pub dst_safety_deposit: u128,
    pub allow_partial_fills: bool,
    pub allow_multiple_fills: bool,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
pub struct TimeLocks {
    pub src_withdrawal: u64,
    pub src_public_withdrawal: u64,
    pub src_cancellation: u64,
    pub src_public_cancellation: u64,
    pub dst_withdrawal: u64,
    pub dst_public_withdrawal: u64,
    pub dst_cancellation: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
pub struct EscrowImmutables {
    pub order: CrossChainOrder,
    pub time_locks: TimeLocks,
    pub deployed_at: u64,
    pub taker: AccountId,
    pub amount: u128,
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
        amount: u128,
        _secret_hash: String,
    ) -> AccountId {
        assert_eq!(env::predecessor_account_id(), self.owner_id, "Only owner can create escrows");

        let immutables = EscrowImmutables {
            order,
            time_locks,
            deployed_at: env::block_timestamp(),
            taker,
            amount,
        };

        let escrow_id = format!("escrow_{}.{}", self.escrow_counter, env::current_account_id());
        let escrow_account_id: AccountId = escrow_id.parse().unwrap();

        self.escrows.insert(escrow_account_id.clone(), immutables.clone());
        self.escrow_counter += 1;

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

        escrow_account_id
    }

    pub fn get_escrow(&self, escrow_id: AccountId) -> Option<EscrowImmutables> {
        self.escrows.get(&escrow_id).cloned()
    }

    pub fn get_escrow_counter(&self) -> u64 {
        self.escrow_counter
    }
} 