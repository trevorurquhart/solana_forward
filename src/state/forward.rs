use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct Forward {
    id: u32,
}

impl Forward {
    pub fn new(id: u32) -> Self {
        Forward {
            id,
        }
    }
}