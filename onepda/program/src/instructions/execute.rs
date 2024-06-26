use std::slice::Iter;

use borsh::BorshDeserialize;
use solana_program::account_info::{AccountInfo, next_account_info};
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program::{invoke, invoke_signed};
use solana_program::program_error::ProgramError;
use solana_program::program_pack::Pack;
use solana_program::pubkey::Pubkey;
use solana_program::rent::Rent;
use solana_program::sysvar::Sysvar;
use spl_associated_token_account::get_associated_token_address_with_program_id;
use spl_associated_token_account::instruction::create_associated_token_account_idempotent;
use spl_token_2022::{check_spl_token_program_account, check_system_program_account};
use spl_token_2022::instruction::transfer_checked;
use spl_token_2022::state::{Account, Mint};

use crate::errors::{assert_that, ForwardError};
use crate::state::Forward;

#[macro_export]
macro_rules! compute_fn {
    ($msg:expr=> $($tt:tt)*) => {
        ::solana_program::msg!(concat!($msg, " {"));
        ::solana_program::log::sol_log_compute_units();
        let res = { $($tt)* };
        ::solana_program::log::sol_log_compute_units();
        ::solana_program::msg!(concat!(" } // ", $msg));
        res
    };
}

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

    maybe_forward_tokens(&&forward, forward_account, destination_account, accounts_iter)
        .and_then(|_|
            forward_sol(forward_account, destination_account))

}

fn maybe_forward_tokens<'a>(
    forward: &Forward,
    forward_account: &AccountInfo<'a>,
    target_account: &AccountInfo<'a>,
    accounts_iter: &mut Iter<AccountInfo<'a>>,
) -> ProgramResult {
    if let (Some(signer), Some(system_program), Some(token_program), Some(ata_token)) = (accounts_iter.next(), accounts_iter.next(), accounts_iter.next(), accounts_iter.next()) {
        check_spl_token_program_account(token_program.key)?;
        check_system_program_account(system_program.key)?;
        assert_that("Signer is signer", signer.is_signer, ProgramError::MissingRequiredSignature)?;

        return forward_tokens(token_program, &forward, forward_account, target_account, signer, system_program, ata_token, accounts_iter);
    }
    Ok(())
}

fn forward_tokens<'a>(
    token_program: &AccountInfo<'a>,
    forward: &Forward,
    forward_account: &AccountInfo<'a>,
    target_account: &AccountInfo<'a>,
    signer: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    ata_program: &AccountInfo<'a>,
    accounts_iter: &mut Iter<AccountInfo<'a>>,
) -> ProgramResult {
    while let (Some(mint), Some(forward_ata), Some(target_ata)) = (accounts_iter.next(), accounts_iter.next(), accounts_iter.next()) {
        forward_token(forward, token_program, mint, forward_account, target_account, forward_ata, target_ata, signer, system_program, ata_program)?;
    }

    Ok(())
}

fn forward_token<'a>(
    forward: &Forward,
    token_program: &AccountInfo<'a>,
    mint_account: &AccountInfo<'a>,
    forward_account: &AccountInfo<'a>,
    target_account: &AccountInfo<'a>,
    forward_ata_account: &AccountInfo<'a>,
    target_ata_account: &AccountInfo<'a>,
    signer: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    ata_program: &AccountInfo<'a>,
) -> ProgramResult {
    assert_that("Forward ATA matches forward",
                *forward_ata_account.key == get_associated_token_address_with_program_id(&forward_account.key, mint_account.key, token_program.key),
                ProgramError::from(ForwardError::InvalidTokenSource))?;

    assert_that("Target ATA matches forward",
                *target_ata_account.key == get_associated_token_address_with_program_id(&target_account.key, mint_account.key, token_program.key),
                ProgramError::from(ForwardError::InvalidTokenDestination))?;

    let forward_ata_state = Account::unpack(&forward_ata_account.data.borrow())?;
    let token_balance = forward_ata_state.amount;
    if token_balance == 0 {
        return Ok(());
    }

    //Creates an associated token account for the given wallet address and token mint, if it doesn't already exist.
    // Returns an error if the account exists, but with a different owner.
    // [writeable,signer] Funding account (must be a system account)
    // [writeable] Associated token account address to be created
    // [] Wallet address for the new associated token account
    // [] The token mint for the new associated token account
    // [] System program
    // [] SPL Token program
    // [] ATA Token program <--- NOT IN THE DOCS!!!!

    invoke(
        &create_associated_token_account_idempotent(
            signer.key,
            target_account.key,
            mint_account.key,
            token_program.key,
        ),
        &[
            signer.clone(),
            target_ata_account.clone(),
            target_account.clone(),
            mint_account.clone(),
            system_program.clone(),
            token_program.clone(),
            ata_program.clone(),
        ], )?;

    let mint = Mint::unpack(&mint_account.data.borrow())?;
    invoke_signed(
        &transfer_checked(
            token_program.key,
            forward_ata_account.key,
            mint_account.key,
            target_ata_account.key,
            forward_account.key,
            &[forward_account.key],
            token_balance,
            mint.decimals,
        )?,
        &[
            forward_ata_account.clone(),
            mint_account.clone(),
            target_ata_account.clone(),
            forward_account.clone(),
        ],
        &[&[
            Forward::FORWARD_SEED.as_ref(),
            forward.destination.as_ref(),
            forward.id.to_le_bytes().as_ref(),
            &[forward.bump]]])
}

fn forward_sol(forward_account: &AccountInfo, destination_account: &AccountInfo) -> ProgramResult {
    compute_fn! { "onepda forward_sol" => {
        let rent_balance = Rent::get()?.minimum_balance(forward_account.data_len());
        let available_sol = forward_account.lamports().checked_sub(rent_balance).ok_or(ForwardError::UnderflowError)?;

        if available_sol > 0 {
            **forward_account.try_borrow_mut_lamports()? = rent_balance;
            **destination_account.try_borrow_mut_lamports()? = destination_account.lamports().checked_add(available_sol).ok_or(ForwardError::OverflowError)?;
        }
        Ok(())
    }}
}

fn validate_and_get_forward(program_id: &Pubkey, forward_account: &&AccountInfo) -> Result<Forward, ProgramError> {
    assert_that("Forward account is owned by program", forward_account.owner == program_id, ProgramError::IncorrectProgramId)?;
    Ok(Forward::try_from_slice(&forward_account.try_borrow_mut_data()?)?)
}



