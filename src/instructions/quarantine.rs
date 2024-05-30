use solana_program::account_info::{AccountInfo, next_account_info};
use solana_program::entrypoint::ProgramResult;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;

use crate::errors::{assert_that, ForwardError};
use crate::instructions::forward_to_address::{forward_to_address, validate_and_get_forward};

/**
 * Execute the quarantine instruction
 * Requires the forward authority to sign the transaction
 * @param program_id The program id
 * @param accounts The accounts to execute the instruction
 *  - accounts[0] The forward account
 *  - accounts[1] The quarantine account
 *  - accounts[2] The forward authority account
 *  - If tokens are to be quarantined, the following accounts are required
 *      - accounts[3] A signer account (will pay for the destination ata to be created if it does not exist)
 *      - accounts[4] The system program account
 *      - accounts[5] The token program account
 *      - accounts[6] The associated token program account
 *
 *      - Followed by the following 3 accounts for each mint/token to quarantine:
 *      - accounts[7] The mint account
 *      - accounts[8] The forward ATA account
 *      - accounts[9] The destination ATA account
* @return Ok(()) if the instruction is executed successfully, otherwise an error
 */

pub fn quarantine(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {

    assert_that("Valid number of accounts",
                accounts.len() == 3 || (accounts.len() >= 10 && (accounts.len() - 7) % 3 == 0),
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