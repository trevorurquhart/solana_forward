use solana_program::account_info::{AccountInfo, next_account_info};
use solana_program::entrypoint::ProgramResult;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;

use crate::errors::{assert_that, ForwardError};
use crate::instructions::execute_forward::{forward_to_destination, get_forward};

pub fn quarantine(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {

    let accounts_iter = &mut accounts.iter();
    let forward_account = next_account_info(accounts_iter)?;
    let forward = get_forward(program_id, &forward_account)?;
    let quarantine_account = next_account_info(accounts_iter)?;
    let authority_account = next_account_info(accounts_iter)?;

    assert_that("Authority is valid", *authority_account.key == forward.authority, ProgramError::from(ForwardError::InvalidAuthority))?;
    assert_that("Authority is signer", authority_account.is_signer, ProgramError::from(ForwardError::InvalidAuthority))?;
    assert_that("Quarantine destination is valid",*quarantine_account.key == forward.quarantine, ProgramError::from(ForwardError::InvalidDestination))?;

    forward_to_destination(&forward, forward_account, quarantine_account, accounts_iter)
}