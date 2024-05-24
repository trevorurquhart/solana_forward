use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{account_info::{AccountInfo, next_account_info}, entrypoint::ProgramResult, pubkey::Pubkey, rent::Rent, system_instruction, sysvar::Sysvar};
use solana_program::program::invoke_signed;
use solana_program::program_error::ProgramError;
use solana_program::program_pack::Pack;
use spl_token::state::Account as SplTokenAccount;
use spl_token_2022::state::Account as SplToken2022Account;

use crate::errors::{assert_that, ForwardError};
use crate::errors::ForwardError::{DestinationNotInitialised, QuarantineNotInitialised};
use crate::state::Forward;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct CreateForwardInstruction {
    id: u32,
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
    let quarantine_account = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;
    let system_account = next_account_info(accounts_iter)?;

    validate(program_id, system_account, forward_account, destination_account, quarantine_account, &instr)
        .and_then(|_|
            create_forward_account(&program_id, &instr, &forward_account, &payer, &system_account, &destination_account.key, quarantine_account.key))
}

fn create_forward_account<'a>(
    program_id: &Pubkey,
    instr: &CreateForwardInstruction,
    forward_account: &AccountInfo<'a>,
    payer: &AccountInfo<'a>,
    system_account: &AccountInfo<'a>,
    destination_key: &Pubkey,
    quarantine_key: &Pubkey
) -> ProgramResult {

    invoke_signed(&system_instruction::create_account(
        payer.key,
        forward_account.key,
        Rent::get()?.minimum_balance(Forward::LEN),
        Forward::LEN.try_into().unwrap(),
        program_id,
    ), &[
        payer.clone(),
        forward_account.clone(),
        system_account.clone(),
    ], &[&[
        Forward::FORWARD_SEED.as_ref(),
        destination_key.as_ref(),
        instr.id.to_le_bytes().as_ref(),
        &[instr.bump]]])?;

    let forward = Forward {
        id: instr.id,
        destination: destination_key.clone(),
        quarantine: quarantine_key.clone(),
        bump: instr.bump,
    };

    forward.serialize(&mut &mut forward_account.data.borrow_mut()[..])?;

    Ok(())
}

fn validate(
    program_id: &Pubkey,
    system_account: &AccountInfo,
    forward_account: &AccountInfo,
    destination_account: &AccountInfo,
    quarantine_account: &AccountInfo,
    instr: &CreateForwardInstruction
) -> ProgramResult {

    assert_that("System program is correct", system_account.key == &solana_program::system_program::id(), ProgramError::IncorrectProgramId)?;
    assert_that("Destination is initialised", destination_account.lamports() > 0, ProgramError::from(DestinationNotInitialised))?;
    assert_that("Quarantine is initialised", quarantine_account.lamports() > 0, ProgramError::from(QuarantineNotInitialised))?;

    //TODO - is the 2nd condition necessary?
    assert_that("Forward does not exist",
                forward_account.lamports() == 0 && Forward::try_from_slice(&forward_account.try_borrow_mut_data()?).is_err(),
                ProgramError::from(ForwardError::ForwardAlreadyExists))?;

    //TODO - is there a better way to do this?
    assert_that("Forward is not an ATA",
                SplToken2022Account::unpack(&destination_account.data.borrow()).is_err() && SplTokenAccount::unpack(&destination_account.data.borrow()).is_err(),
            ProgramError::from(ForwardError::DestinationIsAnAta))?;

    let forward_pda_check =
        Pubkey::create_program_address(&[Forward::FORWARD_SEED.as_ref(), destination_account.key.as_ref(), instr.id.to_le_bytes().as_ref(), &[instr.bump]], program_id);
    assert_that("Forward address is valid",
                forward_pda_check.is_ok() && forward_pda_check.unwrap() == *forward_account.key,
                ProgramError::from(ForwardError::InvalidForwardAddress))?;

    Ok(())
}
