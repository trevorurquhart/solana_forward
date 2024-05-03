# Solana Forward

### How to run locally

#### Install tools

Instructions on how to set up a local environment can be found [here](https://solana.com/developers/guides/getstarted/setup-local-development).

#### Build
```bash
# Install dependencies
$ yarn

# Build
$ cargo build

# Test
$ yarn run test

# Deploy to local validator

$ solana program deploy ./target/deploy/solana_forward.so

# Start local validator:
$ solana-test-validator

# Watch local validator logs
$ solana logs --url localhost
```
