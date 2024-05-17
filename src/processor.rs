use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, pubkey::Pubkey};

use crate::instructions::create::{create, CreateForwardInstruction};
use crate::instructions::execute::execute;

#[derive(BorshSerialize, BorshDeserialize)]
pub enum ForwardInstruction {
    CreateForward(CreateForwardInstruction),
    Execute
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {

    let instruction = ForwardInstruction::try_from_slice(instruction_data)?;

    match instruction {
        ForwardInstruction::CreateForward(args) => { create(program_id, accounts, args)}
        ForwardInstruction::Execute => { execute(program_id, accounts)}
    }
}