use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{account_info::{AccountInfo, next_account_info}, entrypoint::ProgramResult, msg, pubkey::Pubkey, rent::Rent, system_instruction, sysvar::Sysvar};
use solana_program::program::invoke_signed;
use crate::errors::ForwardError::DestinationNotInitialised;

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
    msg!("instr: id: {}, bump: {}", instr.id, instr.bump);

    let accounts_iter = &mut accounts.iter();
    let forward_account = next_account_info(accounts_iter)?;
    let destination_account = next_account_info(accounts_iter)?;
    let quarantine_account = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;
    let system_account = next_account_info(accounts_iter)?;

    assert!(payer.is_signer);
    assert!(payer.is_writable);

    let destination_key = destination_account.key;
    let quarantine_key = quarantine_account.key;

    // let (forward_pda, forward_pda_bump) =
    //     Pubkey::find_program_address(&[Forward::FORWARD_SEED.as_ref(), destination_key.as_ref(), instr.id.to_be_bytes().as_ref()], program_id);
    //
    // msg!("forward_pda: {}, forward_pda_bump: {}", forward_pda, forward_pda_bump);

    // assert!(forward_account.is_signer);
    // assert!(forward_account.is_writable);
    // assert!(system_program::check_id(system_account.key));

    if destination_account.lamports() == 0 {
        return Err(DestinationNotInitialised.into());
    }

    let rent = Rent::get()?.minimum_balance(Forward::LEN);
    // destination_account.key.as_ref()

    invoke_signed(&system_instruction::create_account(
        payer.key,
        forward_account.key,
        rent,
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