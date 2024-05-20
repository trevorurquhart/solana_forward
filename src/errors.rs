use solana_program::{program_error::ProgramError};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ForwardError {

    #[error("Destination not initialised")]
    DestinationNotInitialised,

    #[error("Invalid destination")]
    InvalidDestination,
}

impl From<ForwardError> for ProgramError {
    fn from(e: ForwardError) -> Self {
       ProgramError::Custom(e as u32)
   }
}