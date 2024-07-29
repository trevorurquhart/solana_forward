# Solana Forward

### How to run locally

#### Install tools

Instructions on how to set up a local environment can be found [here](https://solana.com/developers/guides/getstarted/setup-local-development).

#### Build
```bash


# Deploy to local validator
$ cd (onepda|childpda)

# Start local validator:
$ solana-test-validator

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

#### Observations

This has been coded 2 different ways:

##### ChildPda

- Similar design to the multisig
- Creates an account to store the forward state
- The program owns the account
- A pda is derived from the account (but not created). This is where deposits are made.
- The program can move all sol/tokens from the pda to the destination address (and leave the PDA with 0 balance)
- Moving sol is a CPI however as the pda can be owned by any program

##### OnePda

 - derives a forward pda from a destination key + id. 
 - The program owns the pda. 
 - State is stored in the pda
 - Deposits of sol/tokens are to the pda address
 - Executing forward moves the sol/tokens to the destination address
 - Leaves the minimum rent in the pda
 - Moving sol can be done in the program as the program owns the pda 

#### Compute costs (rough - no optimisation yet):

1. Running **_"Should transfer sol when executed"_** on both contracts:
 - Child PDA: 4460 units
```
Transaction executed in slot 65825:
  Signature: 2D5UaBAumb1iQyjzCZ5hZvFoG4imVpzLxeWWDf9WMVJFfU3cb3hKZ3uky5Z5oZkdFXngkMkeUAQhGKJSAfekwU12
  Status: Ok
  Log Messages:
    Program AvN4kzrkAMUNjxfQUNGmDGnxwao765tTYVskh8k71Ljg invoke [1]
    Program log: Executing forward instruction, accounts 4
    Program log: child forward_sol {
    Program consumption: 197646 units remaining
    Program 11111111111111111111111111111111 invoke [2]
    Program 11111111111111111111111111111111 success
    Program consumption: 195735 units remaining
    Program log:  } // child forward_sol
    Program AvN4kzrkAMUNjxfQUNGmDGnxwao765tTYVskh8k71Ljg consumed 4460 of 200000 compute units
    Program AvN4kzrkAMUNjxfQUNGmDGnxwao765tTYVskh8k71Ljg success
```
- One PDA: 2356 units
```
Transaction executed in slot 55234:
  Signature: 2RCJzqgSfMoL4yhvd2CSoNMzv31wWWS21ThUowmC6RkQvgwUykR8fZrDRPnRMf8e8G1De4eHkrzceyvh4ytGwgSe
  Status: Ok
  Log Messages:
    Program 6xk9UUsMd5Mh4tVpk9ep64DtGbhcUUoKYBVMLy5vRWcW invoke [1]
    Program log: Executing forward instruction, accounts 2
    Program log: onepda forward_sol {
    Program consumption: 198411 units remaining
    Program consumption: 197802 units remaining
    Program log:  } // onepda forward_sol
    Program 6xk9UUsMd5Mh4tVpk9ep64DtGbhcUUoKYBVMLy5vRWcW consumed 2356 of 200000 compute units
    Program 6xk9UUsMd5Mh4tVpk9ep64DtGbhcUUoKYBVMLy5vRWcW success

sol transfer with CPI: (195735 - 197646) = 1911
sol transfer with program: (197802 - 198411) = 609
```
2. Running **_"Should transfer tokens when executed"_** on both contracts:
- Child PDA: 52736 units
```
Transaction executed in slot 57518:
  Signature: 65NDUb9JM8ktGWj7KxfUg4L3sox1A24Y9reJXWCKbMSdzUJJYWjCCBrHA3krYJTucLfXin2kQVdKYN2JBaeDpRYm
  Status: Ok
  Log Messages:
    Program AgrBWgUDR2CrLMBsPi5QpiwA6yLDLsmZ92W8CgsD4rub invoke [1]
    Program log: Executing forward instruction, accounts 10
    Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL invoke [2]
    Program log: CreateIdempotent
    Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL consumed 11937 of 170474 compute units
    Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL success
    Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]
    Program log: Instruction: TransferChecked
    Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 6257 of 156056 compute units
    Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success
    Program log: child forward_sol {
    Program consumption: 149490 units remaining
    Program 11111111111111111111111111111111 invoke [2]
    Program 11111111111111111111111111111111 success
    Program consumption: 147579 units remaining
    Program log:  } // child forward_sol
    Program AgrBWgUDR2CrLMBsPi5QpiwA6yLDLsmZ92W8CgsD4rub consumed 52736 of
```
- One PDA: 36845
```
Transaction executed in slot 58350:
  Signature: 2czXYVzHtojA4JjTzxmTjw67kWNAAqDeLcqQnVdB332ZPRoUG1YSWas9YXLNGkk7d5ApY3tNDd5yNMSxCBSAW7Lc
  Status: Ok
  Log Messages:
    Program 3XLtXUeyLTyyKHMY6vjdv8XsfAdViTf55y9jfi6iTpcJ invoke [1]
    Program log: Executing forward instruction, accounts 9
    Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL invoke [2]
    Program log: CreateIdempotent
    Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL consumed 7437 of 180475 compute units
    Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL success
    Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]
    Program log: Instruction: TransferChecked
    Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 6257 of 170537 compute units
    Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success
    Program log: onepda forward_sol {
    Program consumption: 163984 units remaining
    Program consumption: 163453 units remaining
    Program log:  } // onepda forward_sol
    Program 3XLtXUeyLTyyKHMY6vjdv8XsfAdViTf55y9jfi6iTpcJ consumed 36845 of 200000 compute units
    Program 3XLtXUeyLTyyKHMY6vjdv8XsfAdViTf55y9jfi6iTpcJ success
```
 - TODO - why is the idempotent instruction more expensive in the childpda soln. double check these figures
#### Questions

 - Should the transfer of sol and tokens be combined? Or should we have separate instructions? One for sol and one for tokens?
 - Should only the forward authority be allowed to execute the forward (in theory it doesn't matter?)
 - Check Token 2022 program works
 - security.txt
 - idl
 - close account (execute & close?). revitalize account?
 - one pda, instead of a u32 for id, should it be a string?
 