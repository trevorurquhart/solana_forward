use borsh::BorshDeserialize;
use solana_program::account_info::{AccountInfo, next_account_info};
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program::invoke_signed;
use solana_program::program_pack::Pack;
use crate::state::Forward;
use spl_token::instruction::transfer;
use spl_token::state::Account;

pub fn execute_token(
    accounts: &[AccountInfo],
) -> ProgramResult {

    let accounts_iter = &mut accounts.iter();
    let forward_account = next_account_info(accounts_iter)?;
    let forward_ata_account = next_account_info(accounts_iter)?;
    let destination_ata_account = next_account_info(accounts_iter)?;
    let token_program = next_account_info(accounts_iter)?;

    let forward = Forward::try_from_slice(&forward_account.try_borrow_mut_data()?)?;


    let forward_ata_state = Account::unpack(&forward_ata_account.data.borrow())?;
    let token_balance = forward_ata_state.amount;

    // let mut forward = Forward::try_from_slice(&forward_account.try_borrow_mut_data()?)?;
    // if (destination_account.key != forward.destination){
    //         return Err(ForwardError::InvalidDestination.into());
    //
    // }
    // if amount <= 0 {
    //     return Err(ForwardError::InsufficientFunds.into());
    // }
    msg!("Creating transfer instruction");
    let transfer_instruction = transfer(
        token_program.key,
        forward_ata_account.key,
        destination_ata_account.key,
        forward_account.key,
        &[forward_account.key],
        token_balance,
    );
    msg!("Created transfer instruction");
    invoke_signed(
        &transfer_instruction?,
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