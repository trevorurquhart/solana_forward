use borsh::BorshDeserialize;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_error::ProgramError,
    pubkey::Pubkey,
};
use crate::instructions;
use crate::state::Forward;


pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if let Ok(forward) = Forward::try_from_slice(instruction_data) {
        return instructions::create_forward::create_forward(program_id, accounts, forward);
    };

    Err(ProgramError::InvalidInstructionData)
}