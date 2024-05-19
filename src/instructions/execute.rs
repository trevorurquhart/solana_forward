use std::slice::Iter;

use borsh::BorshDeserialize;
use solana_program::account_info::{AccountInfo, next_account_info};
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program::invoke_signed;
use solana_program::program_pack::Pack;
use solana_program::pubkey::Pubkey;
use solana_program::rent::Rent;
use solana_program::sysvar::Sysvar;
use spl_token::instruction::transfer;
use spl_token::state::Account;

use crate::errors::ForwardError;
use crate::state::Forward;

pub fn execute(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {

    let accounts_iter = &mut accounts.iter();
    let forward_account = next_account_info(accounts_iter)?;
    let destination_account = next_account_info(accounts_iter)?;
    let forward = Forward::try_from_slice(&forward_account.try_borrow_mut_data()?)?;

    let lamports = forward_account.lamports();
    msg!("Starting sol balance in forward: {}", lamports);


    forward_sol(forward_account, destination_account, &forward)
        .and_then(|_| {
            let lamports = forward_account.lamports();
            msg!("Forwarded sol, balance in forward: {}", lamports);
            match accounts_iter.next()
            {
                Some(token_program) => forward_tokens(token_program, &forward, forward_account, destination_account, accounts_iter),
                None => Ok(()),
            }
        })
}

fn forward_tokens<'a>(token_program: &AccountInfo<>, forward: &Forward, forward_account: &AccountInfo<'a>, destination_account: &AccountInfo, accounts_iter: &mut Iter<AccountInfo<'a>>) -> ProgramResult{
    while let (Some(forward_ata), Some(destination_ata)) = (accounts_iter.next(), accounts_iter.next())  {
        let result = forward_token(forward, token_program, forward_account, destination_account, forward_ata, destination_ata);
        msg!("Forward token result, {}", result.is_err());
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
    forward_account: &AccountInfo<'a>,
    _destination_account: &AccountInfo,
    forward_ata_account: &AccountInfo<'a>,
    destination_ata_account: &AccountInfo<'a>
) -> ProgramResult {

    msg!("Executing token");

    let forward_ata_state = Account::unpack(&forward_ata_account.data.borrow())?;
    let token_balance = forward_ata_state.amount;

    invoke_signed(
        &transfer(
            token_program.key,
            forward_ata_account.key,
            destination_ata_account.key,
            forward_account.key,
            &[forward_account.key],
            token_balance,
        )?,
        &[
            forward_ata_account.clone(),
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

fn forward_sol(forward_account: &AccountInfo, destination_account: &AccountInfo, forward: &Forward) -> ProgramResult {

    if *destination_account.key != forward.destination {
        msg!("Destination does not match forward");
        return Err(ForwardError::InvalidDestination.into());
    }

    let rent_balance = Rent::get()?.minimum_balance(forward_account.data_len());
    let available_sol = forward_account.lamports() - rent_balance;
    if available_sol > 0 {
        **forward_account.try_borrow_mut_lamports()? -= available_sol;
        **destination_account.try_borrow_mut_lamports()? += available_sol;
    }
    Ok(())
}
