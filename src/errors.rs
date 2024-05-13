use {
    num_derive::FromPrimitive,
    solana_program::{decode_error::DecodeError, program_error::ProgramError},
    thiserror::Error,
};

#[derive(Clone, Debug, Eq, Error, FromPrimitive, PartialEq)]
pub enum ForwardError {
    // 0
    /// Associated token account owner does not match address derivation
    #[error("Associated token account owner does not match address derivation")]
    InvalidOwner,
}