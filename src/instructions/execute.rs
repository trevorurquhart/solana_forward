use solana_program::account_info::{AccountInfo, next_account_info};
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::pubkey::Pubkey;

use crate::errors::ForwardError;
use crate::instructions::execute_forward::{forward_to_destination, validate_forward};

pub fn execute(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {

    let accounts_iter = &mut accounts.iter();
    let forward_account = next_account_info(accounts_iter)?;
    let forward = validate_forward(program_id, &forward_account)?;
    let destination_account = next_account_info(accounts_iter)?;

    if *destination_account.key != forward.destination {
        msg!("Destination does not match forward");
        return Err(ForwardError::InvalidDestination.into());
    }
    forward_to_destination(&forward, forward_account, destination_account, accounts_iter)
}



