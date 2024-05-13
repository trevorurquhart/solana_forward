use solana_program::entrypoint;

use processor::process_instruction;

pub mod processor;
pub mod state;
pub mod instructions;
mod errors;

entrypoint!(process_instruction);