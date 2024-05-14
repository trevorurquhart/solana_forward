use solana_program::account_info::{AccountInfo, next_account_info};
use solana_program::entrypoint::ProgramResult;
use solana_program::rent::Rent;
use solana_program::sysvar::Sysvar;

pub fn execute_sol(
    accounts: &[AccountInfo],
) -> ProgramResult {

    let accounts_iter = &mut accounts.iter();
    let forward_account = next_account_info(accounts_iter)?;
    let destination_account = next_account_info(accounts_iter)?;

    // let mut forward = Forward::try_from_slice(&forward_account.try_borrow_mut_data()?)?;
    // if (destination_account.key != forward.destination){
    //         return Err(ForwardError::InvalidDestination.into());
    //
    // }

    let rent_balance = Rent::get()?.minimum_balance(forward_account.data_len());
    let amount = forward_account.lamports() - rent_balance;
    // if amount <= 0 {
    //     return Err(ForwardError::InsufficientFunds.into());
    // }

    **forward_account.try_borrow_mut_lamports()? -= amount;
    **destination_account.try_borrow_mut_lamports()? += amount;

    Ok(())
}