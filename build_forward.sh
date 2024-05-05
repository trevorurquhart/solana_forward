#!/bin/bash

# Build and deploye the program.

cargo build-bpf
solana program deploy ./target/deploy/solana_forward.so