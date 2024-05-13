use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, pubkey::Pubkey};

use crate::instructions::create_forward::{create_forward, CreateForwardInstruction};

#[derive(BorshSerialize, BorshDeserialize)]
pub enum ForwardInstruction {
    CreateForward(CreateForwardInstruction),
    ForwardSol,
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {

    let instruction = ForwardInstruction::try_from_slice(instruction_data)?;

    match instruction {
        ForwardInstruction::CreateForward(args) => {create_forward(program_id, accounts, args)}
        ForwardInstruction::ForwardSol => {}
    }
}