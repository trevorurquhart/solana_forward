use solana_program::{msg, program_error::ProgramError};
use solana_program::entrypoint::ProgramResult;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ForwardError {

    #[error("Destination not initialised")]
    DestinationNotInitialised,

    #[error("Destination should not be an ATA")]
    DestinationIsAnAta,

    #[error("Quarantine should not be an ATA")]
    QuarantineIsAnAta,

    #[error("Invalid destination")]
    InvalidDestination,

    #[error("Invalid token source")]
    InvalidTokenSource,

    #[error("Invalid token destination")]
    InvalidTokenDestination,

    #[error("Forward account already exists")]
    ForwardAlreadyExists,

    #[error("Invalid forward address")]
    InvalidForwardAddress,

    #[error("Quarantine not initialised")]
    QuarantineNotInitialised,

    #[error("Invalid Authority")]
    InvalidAuthority,

    #[error("Invalid number of accounts")]
    InvalidNumberOfAccounts,
}

impl From<ForwardError> for ProgramError {
    fn from(e: ForwardError) -> Self {
       ProgramError::Custom(e as u32)
   }
}


pub fn assert_that(requirement: &str, condition: bool, error: ProgramError) -> ProgramResult {
    if condition {
        Ok(())
    } else {
        msg!("{} - failed", requirement);
        Err(error.into())
    }
}

