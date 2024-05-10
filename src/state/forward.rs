use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct Forward {
    pub id: u32,
    pub destination: Pubkey,
    pub quarantine: Pubkey,
    pub bump: u8,
}

impl Forward {

    pub const FORWARD_SEED: &'static[u8] = b"forward";
    pub const LEN: usize = 4 + 32 + 32 + 1;

    pub fn new(id: u32, destination: Pubkey, quarantine: Pubkey, bump: u8) -> Self {
        Forward {
            id,
            destination,
            quarantine,
            bump
        }
    }
}
