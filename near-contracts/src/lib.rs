use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{env, near_bindgen, AccountId, Gas, PanicOnDefault, Promise};
use crate::types::Balance;

mod escrow_factory;
mod resolver;
mod escrow;
mod types;

pub use escrow_factory::EscrowFactory;
pub use resolver::Resolver;
pub use escrow::Escrow;
pub use types::*;

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct CrossChainSwap {
    pub escrow_factory: EscrowFactory,
    pub resolver: Resolver,
}

#[near_bindgen]
impl CrossChainSwap {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        Self {
            escrow_factory: EscrowFactory::new(owner_id.clone()),
            resolver: Resolver::new(owner_id, owner_id.clone()),
        }
    }
} 