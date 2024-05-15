use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, pubkey::Pubkey};

use crate::instructions::create::{create, CreateForwardInstruction};
use crate::instructions::execute_sol::execute_sol;
use crate::instructions::execute_token::execute_token;

#[derive(BorshSerialize, BorshDeserialize)]
pub enum ForwardInstruction {
    CreateForward(CreateForwardInstruction),
    ExecuteSol,
    ExecuteToken,
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {

    let instruction = ForwardInstruction::try_from_slice(instruction_data)?;

    match instruction {
        ForwardInstruction::CreateForward(args) => { create(program_id, accounts, args)}
        ForwardInstruction::ExecuteSol => { execute_sol(accounts)}
        ForwardInstruction::ExecuteToken => {execute_token(accounts)}
    }
}