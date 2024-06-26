#!/bin/bash

set -x
# Build and deploy the program.

rm -r ./program/target
cargo build-bpf --manifest-path=./program/Cargo.toml --bpf-out-dir=./program/target/so
if [ $? -eq 0 ]; then
    solana program deploy ./program/target/so/solana_forward_childpda.so
fi

# Output (if /home exists):
# Documents Downloads Pictures Videos
# Command succeeded

