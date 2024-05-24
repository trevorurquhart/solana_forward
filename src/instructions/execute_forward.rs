use std::slice::Iter;

use borsh::BorshDeserialize;
use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program::invoke_signed;
use solana_program::program_error::ProgramError;
use solana_program::program_pack::Pack;
use solana_program::pubkey::Pubkey;
use solana_program::rent::Rent;
use solana_program::sysvar::Sysvar;
use spl_associated_token_account::get_associated_token_address;
use spl_token_2022::check_spl_token_program_account;
use spl_token_2022::instruction::transfer_checked;
use spl_token_2022::state::{Account, Mint};

use crate::errors::ForwardError;
use crate::state::Forward;

pub fn forward_to_destination<'a>(
    forward: &Forward,
    forward_account: &AccountInfo<'a>,
    destination_account: &AccountInfo<'a>,
    accounts_iter: &mut Iter<AccountInfo<'a>>,
) -> ProgramResult {

    maybe_forward_tokens(&forward, forward_account, accounts_iter)
        .and_then(|_|
            forward_sol(forward_account, destination_account))
}

fn maybe_forward_tokens<'a>(forward: &Forward, forward_account: &AccountInfo<'a>, accounts_iter: &mut Iter<AccountInfo<'a>>) -> ProgramResult {
    if let Some(token_program) = accounts_iter.next() {
        check_spl_token_program_account(token_program.key)?;
        return forward_tokens(token_program, &forward, forward_account, accounts_iter)
    }
    Ok(())
}

fn forward_tokens<'a>(token_program: &AccountInfo<>, forward: &Forward, forward_account: &AccountInfo<'a>, accounts_iter: &mut Iter<AccountInfo<'a>>) -> ProgramResult{
    while let (Some(mint), Some(forward_ata), Some(destination_ata)) = (accounts_iter.next(), accounts_iter.next(), accounts_iter.next())  {
        let result = forward_token(forward, token_program, mint, forward_account, forward_ata, destination_ata);
        if result.is_err()
        {
            return result;
        }
    }
    Ok(())
}

fn forward_token<'a>(
    forward: &Forward,
    token_program: &AccountInfo,
    mint_account: &AccountInfo<'a>,
    forward_account: &AccountInfo<'a>,
    forward_ata_account: &AccountInfo<'a>,
    destination_ata_account: &AccountInfo<'a>
) -> ProgramResult {

    if *forward_ata_account.key != get_associated_token_address(&forward_account.key, mint_account.key) {
        msg!("Forward ATA does not match forward");
        return Err(ForwardError::InvalidTokenSource.into());
    }

    if *destination_ata_account.key != get_associated_token_address(&forward.destination, mint_account.key) {
        msg!("Destination does not match forward");
        return Err(ForwardError::InvalidTokenDestination.into());
    }

    let forward_ata_state = Account::unpack(&forward_ata_account.data.borrow())?;
    let token_balance = forward_ata_state.amount;

    let mint = Mint::unpack(&mint_account.data.borrow())?;

    if token_balance == 0 {
        return Ok(());
    }

    invoke_signed(
        &transfer_checked(
            token_program.key,
            forward_ata_account.key,
            mint_account.key,
            destination_ata_account.key,
            forward_account.key,
            &[forward_account.key],
            token_balance,
            mint.decimals
        )?,
        &[
            forward_ata_account.clone(),
            mint_account.clone(),
            destination_ata_account.clone(),
            forward_account.clone(),
        ],
        &[&[
            Forward::FORWARD_SEED.as_ref(),
            forward.destination.as_ref(),
            forward.id.to_le_bytes().as_ref(),
            &[forward.bump]]])?;
    Ok(())
}

fn forward_sol(forward_account: &AccountInfo, destination_account: &AccountInfo) -> ProgramResult {

    let rent_balance = Rent::get()?.minimum_balance(forward_account.data_len());
    let available_sol = forward_account.lamports() - rent_balance;

    if available_sol > 0 {
        **forward_account.try_borrow_mut_lamports()? -= available_sol;
        **destination_account.try_borrow_mut_lamports()? += available_sol;
    }
    Ok(())
}

pub fn validate_forward(program_id: &Pubkey, forward_account: &&AccountInfo) -> Result<Forward, ProgramError> {
    if forward_account.owner != program_id {
        msg!("Forward account not owned by this program");
        return Err(ProgramError::IncorrectProgramId.into());
    }
    Ok(Forward::try_from_slice(&forward_account.try_borrow_mut_data()?)?)
}