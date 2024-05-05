use borsh::BorshSerialize;
use borsh::object_length;

use solana_program::{
    account_info::{AccountInfo, next_account_info},
    entrypoint::ProgramResult,
    program::invoke,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

use crate::state::Forward;

pub fn create_forward(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    forward: Forward,
) -> ProgramResult {

    let accounts_iter = &mut accounts.iter();
    let forward_account = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;


    let account_span = object_length(&forward)?;
    // let account_span = 4;
    let lamports_required = (Rent::get()?).minimum_balance(account_span);

    invoke(
        &system_instruction::create_account(
            payer.key,
            forward_account.key,
            lamports_required,
            account_span as u64,
            program_id,
        ),
        &[
            payer.clone(),
            forward_account.clone(),
            system_program.clone(),
        ],
    )?;

    forward.serialize(&mut &mut forward_account.data.borrow_mut()[..])?;
    Ok(())
}