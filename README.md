# Solana Forward

### How to run locally

#### Install tools

Instructions on how to set up a local environment can be found [here](https://solana.com/developers/guides/getstarted/setup-local-development).

#### Build
```bash

# Start local validator:
$ solana-test-validator

# Deploy to local validator
$ cd onepda
# cargo build-bpf
# solana program deploy ./program/target/so/solana_forward.so
$ ./build_forward.sh

# Install dependencies
$ yarn

# Test
# all tests
$ yarn run tests
# specific test suite/test name
$ yarn run tests -g "quarantine instruction tests"
# test file
$ yarn run test tests/quarantine.ts


````

#### Useful Solana commands

```bash
# Point solana at localhost validator
$ solana config set --url localhost

# Show solana config
$ solana config get

# Create a new system wallet locally (~/.config/solana/id.json)
$ solana-keygen new

# Set default wallet
$ solana config set -k ~/.config/solana/id.json

# Drop tokens to wallet
$ solana airdrop 2

# Get wallet ballance
$ solana balance

# Watch local validator logs
$ solana logs --url localhost
```

#### Questions

 - Should the transfer of sol and tokens be combined? Or should we have separate instructions? One for sol and one for tokens?
 - Should only the forward authority be allowed to execute the forward (in theory it doesn't matter?)
 - Check Token 2022 program works
 - security.txt
 - idl
 - close account (execute & close?). revitalize account?
 