use solana_program::{program_error::ProgramError};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ForwardError {

    #[error("Destination not initialised")]
    DestinationNotInitialised,

    #[error("Destination should not be owned by the token program")]
    DestinationIsAnAta,

    #[error("Invalid destination")]
    InvalidDestination,

    #[error("Forward account already exists")]
    ForwardAlreadyExists,
}

impl From<ForwardError> for ProgramError {
    fn from(e: ForwardError) -> Self {
       ProgramError::Custom(e as u32)
   }
}