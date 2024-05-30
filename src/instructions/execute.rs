use solana_program::account_info::{AccountInfo, next_account_info};
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;

use crate::errors::{assert_that, ForwardError};
use crate::instructions::forward_to_address::{forward_to_address, validate_and_get_forward};

/**
 * Execute the forward instruction
 *
 * @param program_id The program id
 * @param accounts The accounts to execute the instruction
 *  - accounts[0] The forward account
 *  - accounts[1] The destination account
 *  - If tokens are to be forwarded, the following accounts are required
 *      - accounts[2] The signer account (will pay for the destination ata to be created if it does not exist)
 *      - accounts[3] The system program account
 *      - accounts[4] The token program account
 *      - accounts[5] The associated token program account
 *
 *      - Followed by the following 3 accounts for each mint/token to forward:
 *      - accounts[6] The mint account
 *      - accounts[7] The forward ATA account
 *      - accounts[8] The destination ATA account
 * @return Ok(()) if the instruction is executed successfully, otherwise an error
 */

pub fn execute(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {

    msg!("Executing forward instruction, accounts {}", accounts.len());
    assert_that("Valid number of accounts",
                accounts.len() == 2 || (accounts.len() >= 9 && accounts.len() % 3 == 0),
                ProgramError::from(ForwardError::InvalidNumberOfAccounts))?;

    let accounts_iter = &mut accounts.iter();
    let forward_account = next_account_info(accounts_iter)?;
    let destination_account = next_account_info(accounts_iter)?;

    let forward = validate_and_get_forward(program_id, &forward_account)?;
    assert_that("Destination is valid", *destination_account.key == forward.destination, ProgramError::from(ForwardError::InvalidDestination))?;

    forward_to_address(&forward, forward_account, destination_account, accounts_iter)
}



