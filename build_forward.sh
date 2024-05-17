#!/bin/bash

# Build and deploy the program.

cargo build-bpf
if [ $? -eq 0 ]; then
    solana program deploy ./target/deploy/solana_forward.so
fi

# Output (if /home exists):
# Documents Downloads Pictures Videos
# Command succeeded

