use solana_program::account_info::{AccountInfo, next_account_info};
use solana_program::entrypoint::ProgramResult;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;

use crate::errors::{assert_that, ForwardError};
use crate::instructions::forward_to_address::{forward_to_address, validate_and_get_forward};

/**
 * Execute the quarantine instruction
 *
 * @param program_id The program id
 * @param accounts The accounts to execute the instruction
 *  - accounts[0] The forward account
 *  - accounts[1] The quarantine account
 *  - accounts[2] The authority account
 *  - If tokens are to be forwarded, the following accounts are required
 *  - accounts[3] The token program account
 *  - Repeat the following 3 accounts for each mint/token to forward:
 *  - accounts[4] The mint account
 *  - accounts[6] The forward ATA account
 *  - accounts[6] The quarantine ATA account
* @return Ok(()) if the instruction is executed successfully, otherwise an error
 */

pub fn quarantine(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {

    assert_that("Valid number of accounts",
                accounts.len() == 3 || (accounts.len() > 3 && (accounts.len() - 1) % 3 == 0),
                ProgramError::from(ForwardError::InvalidNumberOfAccounts))?;

    let accounts_iter = &mut accounts.iter();
    let forward_account = next_account_info(accounts_iter)?;
    let quarantine_account = next_account_info(accounts_iter)?;
    let authority_account = next_account_info(accounts_iter)?;

    let forward = validate_and_get_forward(program_id, &forward_account)?;
    assert_that("Quarantine is valid",*quarantine_account.key == forward.quarantine, ProgramError::from(ForwardError::InvalidDestination))?;
    assert_that("Authority is valid", *authority_account.key == forward.authority, ProgramError::from(ForwardError::InvalidAuthority))?;
    assert_that("Authority is signer", authority_account.is_signer, ProgramError::from(ForwardError::InvalidAuthority))?;

    forward_to_address(&forward, forward_account, quarantine_account, accounts_iter)
}