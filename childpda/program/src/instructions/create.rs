use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{account_info::{AccountInfo, next_account_info}, entrypoint::ProgramResult, pubkey::Pubkey, rent::Rent, system_instruction, sysvar::Sysvar};
use solana_program::program::invoke;
use solana_program::program_error::ProgramError;
use solana_program::program_pack::Pack;
use spl_token::state::Account as SplTokenAccount;
use spl_token_2022::state::Account as SplToken2022Account;

use crate::errors::{assert_that, ForwardError};
use crate::state::Forward;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct CreateForwardInstruction {
    forward_pda: Pubkey,
    bump: u8,
}

pub fn create(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instr: CreateForwardInstruction,
) -> ProgramResult {

    let accounts_iter = &mut accounts.iter();
    let forward_account = next_account_info(accounts_iter)?;
    let destination_account = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;
    let system_account = next_account_info(accounts_iter)?;

    validate(program_id, system_account, forward_account, destination_account, &instr)
        .and_then(|_|
            create_forward_account(&program_id, &instr, &payer, &system_account, &forward_account, &destination_account.key))
}

fn create_forward_account<'a>(
    program_id: &Pubkey,
    instr: &CreateForwardInstruction,
    payer: &AccountInfo<'a>,
    system_account: &AccountInfo<'a>,
    forward_account: &AccountInfo<'a>,
    destination_key: &Pubkey
) -> ProgramResult {

    invoke(&system_instruction::create_account(
        payer.key,
        forward_account.key,
        Rent::get()?.minimum_balance(Forward::LEN),
        Forward::LEN.try_into().unwrap(),
        program_id,
    ),
           &[
               payer.clone(),
               forward_account.clone(),
               system_account.clone(),
           ],
    )?;

    let forward = Forward::new(
        destination_key.clone(),
        instr.forward_pda.clone(),
        payer.key.clone(),
        instr.bump,
    );

    forward.serialize(&mut &mut forward_account.data.borrow_mut()[..])?;

    Ok(())
}

fn validate(
    program_id: &Pubkey,
    system_account: &AccountInfo,
    forward_account: &AccountInfo,
    destination_account: &AccountInfo,
    instr: &CreateForwardInstruction,
) -> ProgramResult {

    assert_that("System program is correct", system_account.key == &solana_program::system_program::id(), ProgramError::IncorrectProgramId)?;

    //TODO - is the 2nd condition necessary?
    assert_that("Forward does not exist",
                forward_account.lamports() == 0 && Forward::try_from_slice(&forward_account.try_borrow_mut_data()?).is_err(),
                ProgramError::from(ForwardError::ForwardAlreadyExists))?;

    //TODO - is there a better way to do this?
    assert_that("Destination is not an ATA",
                SplToken2022Account::unpack(&destination_account.data.borrow()).is_err() && SplTokenAccount::unpack(&destination_account.data.borrow()).is_err(),
                ProgramError::from(ForwardError::DestinationIsAnAta))?;

    let forward_pda_check =
        Pubkey::create_program_address(&[Forward::FORWARD_SEED.as_ref(), forward_account.key.as_ref(), &[instr.bump]], program_id);

    assert_that("Forward address is valid",
                forward_pda_check.is_ok() && forward_pda_check.unwrap() == instr.forward_pda,
                ProgramError::from(ForwardError::InvalidForwardAddress))
}
