use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult,
    pubkey::Pubkey,
};

use crate::instructions;

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {

    return instructions::create_forward::create_forward(program_id, accounts, instruction_data);
    // Err(ProgramError::InvalidInstructionData)
}