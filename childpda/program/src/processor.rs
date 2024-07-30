use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, pubkey::Pubkey};

use crate::instructions::create::{create, CreateForwardInstruction};
use crate::instructions::execute::{execute, ExecuteForwardInstruction};

#[derive(BorshSerialize, BorshDeserialize)]
pub enum ForwardInstruction {
    CreateForward(CreateForwardInstruction),
    Execute(ExecuteForwardInstruction)
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {

    let instruction = ForwardInstruction::try_from_slice(instruction_data)?;

    match instruction {
        ForwardInstruction::CreateForward(instr) => { create(program_id, accounts, instr)}
        ForwardInstruction::Execute(instr) => { execute(program_id, accounts, instr)}
    }
}