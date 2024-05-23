use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{account_info::{AccountInfo, next_account_info}, entrypoint::ProgramResult, msg, pubkey::Pubkey, rent::Rent, system_instruction, sysvar::Sysvar};
use solana_program::program::invoke_signed;
use solana_program::program_error::ProgramError;
use solana_program::program_pack::Pack;
use spl_token::state::Account as SplTokenAccount;
use spl_token_2022::state::Account as SplToken2022Account;
use crate::errors::ForwardError;

use crate::errors::ForwardError::{DestinationIsAnAta, DestinationNotInitialised};
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

    assert!(payer.is_signer);
    assert!(payer.is_writable);

    validate(&forward_account, &destination_account)
        .and_then(|_| create_forward_account(&program_id, &instr, &forward_account, &payer, &system_account, &destination_account.key, quarantine_account.key)?)
}

fn create_forward_account<'a>(
    program_id: &Pubkey,
    instr: &CreateForwardInstruction,
    forward_account: &AccountInfo<'a>,
    payer: &AccountInfo<'a>,
    system_account: &AccountInfo<'a>,
    destination_key: &Pubkey,
    quarantine_key: &Pubkey
) -> Result<Result<(), ProgramError>, ProgramError> {
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
    Ok(Ok(()))
}

fn validate(forward_account: &&AccountInfo, destination_account: &&AccountInfo) -> ProgramResult {

    // let (forward_pda, forward_pda_bump) =
    //     Pubkey::find_program_address(&[Forward::FORWARD_SEED.as_ref(), destination_key.as_ref(), instr.id.to_be_bytes().as_ref()], program_id);
    //
    // msg!("forward_pda: {}, forward_pda_bump: {}", forward_pda, forward_pda_bump);

    // assert!(forward_account.is_signer);
    // assert!(forward_account.is_writable);
    // assert!(system_program::check_id(system_account.key));

    if destination_account.lamports() == 0 {
        msg!("Destination {} has not been initialised. Has balance: {}", destination_account.key, destination_account.lamports());
        return Err(DestinationNotInitialised.into());
    }

    //TODO: Find a better way to check if destination is an ATA
    if SplToken2022Account::unpack(&destination_account.data.borrow()).is_ok() || SplTokenAccount::unpack(&destination_account.data.borrow()).is_ok() {
        msg!("Destination {} is an ATA", destination_account.key);
        return Err(DestinationIsAnAta.into());
    }

    if Forward::try_from_slice(&forward_account.try_borrow_mut_data()?).is_ok() {
        msg!("Forward account already exists");
        return Err(ForwardError::ForwardAlreadyExists.into());
    }

    Ok(())
}