#!/bin/bash

# Build and deploy the program.

cargo build-bpf
solana program deploy ./target/deploy/solana_forward.so