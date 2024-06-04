use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone)]
pub struct Forward {
    pub destination: Pubkey,
    pub forward_pda: Pubkey,
    pub authority: Pubkey,
    pub bump: u8,
}

impl Forward {

    pub const FORWARD_SEED: &'static[u8] = b"forward";
    pub const LEN: usize = 32 + 32 + 32 + 1;

    pub fn new(destination: Pubkey, forward_pda: Pubkey, authority: Pubkey, bump: u8) -> Self {
        Forward {
            destination,
            forward_pda,
            authority,
            bump
        }
    }
}
