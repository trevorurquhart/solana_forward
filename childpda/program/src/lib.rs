use solana_program::entrypoint;

use processor::process_instruction;

pub mod processor;
pub mod state;
pub mod instructions;
pub mod errors;

entrypoint!(process_instruction);