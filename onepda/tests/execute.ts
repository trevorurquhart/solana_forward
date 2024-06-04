import {Connection, Keypair, LAMPORTS_PER_SOL,} from '@solana/web3.js';
import {deposit, initialiseAccountWithMinimumBalance} from "./fns/accounts";
import {createForward, deriveForwardPda, execute, executeWithTokens} from "./fns/forwardFns";
import {createKeypairFromFile} from "./fns/createKeyPair";
import {beforeEach} from "mocha";
import {expect} from "chai";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createMint,
    getAssociatedTokenAddressSync,
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import {createAndFundAta} from "./fns/createToken";

describe("execute instruction tests", () => {

    const connection = new Connection(`http://localhost:8899`, 'confirmed');
    const payer = createKeypairFromFile(require('os').homedir() + '/.config/solana/id.json');
    const program = createKeypairFromFile('./program/target/so/solana_forward-keypair.json');
    const mintAuthority = Keypair.generate();
    const forwardId = 123456;

    let destination, mint, forwardPda, forwardBump;

    beforeEach("setup", async () => {
        destination = Keypair.generate();
        await initialiseAccountWithMinimumBalance(destination.publicKey, payer, connection);
        mint = await createMint(connection, payer, mintAuthority.publicKey, null, 0);
        [forwardPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        await createForward(forwardId, destination.publicKey, forwardBump, forwardPda, program, payer, connection);
    });

    it("Should transfer sol when executed", async () => {
        let destinationBalanceBefore = await connection.getBalance(destination.publicKey);
        let forwardAmount = LAMPORTS_PER_SOL / 100;
        await deposit(payer, forwardPda, forwardAmount, connection);
        try {
            await execute(forwardPda, destination, program, payer, connection)
        } catch (e) {
            console.log(e)
        }
        let destinationBalanceAfter = await connection.getBalance(destination.publicKey);
        expect(destinationBalanceAfter - destinationBalanceBefore).to.equal(forwardAmount);
    });

    it("Should transfer tokens when executed", async () => {
        let forwardAmount = 1000;
        let destinationAta = await createAndFundAta(mint, destination.publicKey, 0, payer, mintAuthority, connection);
        let forwardAta = await createAndFundAta(mint, forwardPda, forwardAmount, payer, mintAuthority, connection);
        try {
            await executeWithTokens(forwardPda, destination, program, payer, connection, TOKEN_PROGRAM_ID, mint, forwardAta, destinationAta);
        } catch (e) {
            console.log(e)
        }
        const info = await connection.getTokenAccountBalance(destinationAta);
        expect(info.value.uiAmount).to.equal(forwardAmount);
    });

    it.skip("Should transfer tokens using the token 2022 program", async() => {


        let token2022Address = await getAssociatedTokenAddressSync(mint, destination.publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
        console.log("token2022Address", token2022Address.toBase58())
        // let destinationAta = await createAndFundAta(connection, payer, mint, mintAuthority, 0, destination.publicKey, TOKEN_2022_PROGRAM_ID);

        // let forwardAmount = 1000;
        // let forwardAta = await createAndFundAta(connection, payer, mint, mintAuthority, forwardAmount, forwardPda, TOKEN_2022_PROGRAM_ID);
        // try {
        //     await executeWithTokens(payer, program, connection, forwardPda, destination, TOKEN_2022_PROGRAM_ID, mint, forwardAta, destinationAta);
        // } catch (e) {
        //     console.log(e)
        // }
        // const info = await connection.getTokenAccountBalance(destinationAta);
        // expect(info.value.uiAmount).to.equal(forwardAmount);
    });


    it("Execute will not transfer sol or tokens if there are no funds", async () => {

        let destinationBalanceBefore = await connection.getBalance(destination.publicKey);
        let destinationAta = await createAndFundAta(mint, destination.publicKey, 0, payer, mintAuthority, connection);
        let forwardAta = await createAndFundAta(mint, forwardPda, 0, payer, mintAuthority, connection);

        let minBalance = await connection.getMinimumBalanceForRentExemption(0);
        expect(destinationBalanceBefore).to.equal(minBalance);

        await executeWithTokens(forwardPda, destination, program, payer, connection, TOKEN_PROGRAM_ID, mint, forwardAta, destinationAta);
        const info = await connection.getTokenAccountBalance(destinationAta);
        expect(destinationBalanceBefore).to.equal(minBalance);
        expect(info.value.uiAmount).to.equal(0);
    });

    it("Execute should forward sol and multiple tokens", async () => {
        const mintAuthority2 = Keypair.generate();
        let mint2 = await createMint(connection, payer, mintAuthority2.publicKey, null, 0);

        let solAmount = LAMPORTS_PER_SOL / 200;
        let token1Amount = 300;
        let token2Amount = 400;

        const destSolBalanceBefore = await connection.getBalance(destination.publicKey);

        await deposit(payer, forwardPda, solAmount, connection);
        let fwdAtaToken1 = await createAndFundAta(mint, forwardPda, token1Amount, payer, mintAuthority, connection);
        let fwdAtaToken2 = await createAndFundAta(mint2, forwardPda, token2Amount, payer, mintAuthority2, connection);

        let destAtaToken1 = await createAndFundAta(mint, destination.publicKey, 0, payer, mintAuthority, connection);
        let destAtaToken2 = await createAndFundAta(mint2, destination.publicKey, 0, payer, mintAuthority2, connection);

        try {
            await executeWithTokens(forwardPda, destination, program, payer, connection, TOKEN_PROGRAM_ID, mint, fwdAtaToken1, destAtaToken1, mint2, fwdAtaToken2, destAtaToken2);
        } catch (e) {
            console.error(e);
        }
        const destSolBalance = await connection.getBalance(destination.publicKey);
        const destToken1Balance = (await connection.getTokenAccountBalance(destAtaToken1)).value.uiAmount;
        const destToken2Balance = (await connection.getTokenAccountBalance(destAtaToken2)).value.uiAmount;

        expect(destSolBalance - destSolBalanceBefore, "sol balance").to.equal(solAmount);
        expect(destToken1Balance, "token 1 balance").to.equal(token1Amount);
        expect(destToken2Balance, "token 2 balance").to.equal(token2Amount);
    });

    it("should create a token account for the destination if one does not exist", async () => {

        let tokenAmount = 1000;
        let forwardAta = await createAndFundAta(mint, forwardPda, tokenAmount, payer, mintAuthority, connection);
        const uninitialised = await getAssociatedTokenAddressSync(mint, destination.publicKey);
        try {
            await executeWithTokens(forwardPda, destination, program, payer, connection, TOKEN_PROGRAM_ID, mint, forwardAta, uninitialised);
        } catch (e) {
            console.log(e)
        }
        const info = await connection.getTokenAccountBalance(uninitialised);
        expect(info.value.uiAmount).to.equal(tokenAmount);
    });

    it("should deposit to a destination that has not been initialised", async() => {

        const uninitialisedDestination = Keypair.generate();
        const [newForwardPda, newForwardBump] = deriveForwardPda(uninitialisedDestination.publicKey, forwardId, program.publicKey);
        await createForward(forwardId, uninitialisedDestination.publicKey, newForwardBump, newForwardPda, program, payer, connection);

        let forwardAmount = LAMPORTS_PER_SOL / 100;
        await deposit(payer, newForwardPda, forwardAmount, connection);
        try {
            await execute(newForwardPda, uninitialisedDestination, program, payer, connection)
        } catch (e) {
            console.log(e)
        }
        let destinationBalanceAfter = await connection.getBalance(uninitialisedDestination.publicKey);
        expect(destinationBalanceAfter).to.equal(forwardAmount);
    });
});
