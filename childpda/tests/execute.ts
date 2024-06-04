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
    const program = createKeypairFromFile('./program/target/so/solana_forward_childpda-keypair.json');
    const mintAuthority = Keypair.generate();

    let destination, forwardAccount, mint, forwardPda, forwardBump;

    beforeEach("setup", async () => {
        destination = Keypair.generate();
        forwardAccount = Keypair.generate();
        mint = await createMint(connection, payer, mintAuthority.publicKey, null, 0);
        [forwardPda, forwardBump] = deriveForwardPda(forwardAccount.publicKey, program.publicKey);
        await createForward(forwardAccount, forwardPda, destination.publicKey, payer, program, forwardBump, connection, );
    });

    it("Should transfer sol when executed", async () => {

        let forwardAmount = LAMPORTS_PER_SOL / 100;
        await deposit(connection, payer, destination.publicKey, LAMPORTS_PER_SOL * 3)
        await deposit(connection, payer, forwardPda, forwardAmount);

        let destinationBalanceBefore = await connection.getBalance(destination.publicKey);
        try {
            await execute(payer, program, connection, forwardAccount, forwardPda, destination)
        } catch (e) {
            console.log(e)
        }
        let destinationBalanceAfter = await connection.getBalance(destination.publicKey);

        expect(destinationBalanceAfter - destinationBalanceBefore).to.equal(forwardAmount);
    });

    it("Should transfer tokens when executed", async () => {
        let forwardAmount = 1000;
        let destinationAta = await createAndFundAta(connection, payer, mint, mintAuthority, 0, destination.publicKey);
        let forwardAta = await createAndFundAta(connection, payer, mint, mintAuthority, forwardAmount, forwardPda);
        try {
            await executeWithTokens(payer, program, connection, forwardAccount, forwardPda, destination, TOKEN_PROGRAM_ID, mint, forwardAta, destinationAta);
        } catch (e) {
            console.log(e)
            expect.fail("Should have executed");
            return;
        }
        const info = await connection.getTokenAccountBalance(destinationAta);
        expect(info.value.uiAmount).to.equal(forwardAmount);
    });
    //
    // it.skip("Should transfer tokens using the token 2022 program", async() => {
    //
    //
    //     let token2022Address = await getAssociatedTokenAddressSync(mint, destination.publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    //     console.log("token2022Address", token2022Address.toBase58())
    //     // let destinationAta = await createAndFundAta(connection, payer, mint, mintAuthority, 0, destination.publicKey, TOKEN_2022_PROGRAM_ID);
    //
    //     // let forwardAmount = 1000;
    //     // let forwardAta = await createAndFundAta(connection, payer, mint, mintAuthority, forwardAmount, forwardPda, TOKEN_2022_PROGRAM_ID);
    //     // try {
    //     //     await executeWithTokens(payer, program, connection, forwardPda, destination, TOKEN_2022_PROGRAM_ID, mint, forwardAta, destinationAta);
    //     // } catch (e) {
    //     //     console.log(e)
    //     // }
    //     // const info = await connection.getTokenAccountBalance(destinationAta);
    //     // expect(info.value.uiAmount).to.equal(forwardAmount);
    // });
    //
    //
    it("Execute will not transfer sol or tokens if there are no funds", async () => {

        let destinationTokenBalanceBefore = 1000;
        let destinationSolBalanceBefore = LAMPORTS_PER_SOL/ 200;

        await deposit(connection, payer, destination.publicKey, destinationSolBalanceBefore);
        let destinationAta = await createAndFundAta(connection, payer, mint, mintAuthority, destinationTokenBalanceBefore, destination.publicKey);

        const forwardAta = await createAndFundAta(connection, payer, mint, mintAuthority, 0, forwardPda);

        try {
            await executeWithTokens(payer, program, connection, forwardAccount, forwardPda, destination, TOKEN_PROGRAM_ID, mint, forwardAta, destinationAta);
        } catch (e) {
            console.log(e)
            expect.fail("Should have executed");
            return;
        }

        let destinationBalanceAfter = await connection.getBalance(destination.publicKey);
        expect(destinationBalanceAfter).to.equal(destinationSolBalanceBefore);

        const info = await connection.getTokenAccountBalance(destinationAta);
        expect(info.value.uiAmount).to.equal(destinationTokenBalanceBefore);
    });

    it("Execute should forward sol and multiple tokens", async () => {

        const mintAuthority2 = Keypair.generate();
        let mint2 = await createMint(connection, payer, mintAuthority2.publicKey, null, 0);

        let solAmount = LAMPORTS_PER_SOL / 200;
        let token1Amount = 300;
        let token2Amount = 400;

        await deposit(connection, payer, forwardPda, solAmount);
        let fwdAtaToken1 = await createAndFundAta(connection, payer, mint, mintAuthority, token1Amount, forwardPda);
        let fwdAtaToken2 = await createAndFundAta(connection, payer, mint2, mintAuthority2, token2Amount, forwardPda);

        const destAtaToken1 = await getAssociatedTokenAddressSync(mint, destination.publicKey);
        const destAtaToken2 = await getAssociatedTokenAddressSync(mint2, destination.publicKey);


        try {
            await executeWithTokens(payer, program, connection, forwardAccount, forwardPda, destination, TOKEN_PROGRAM_ID, mint, fwdAtaToken1, destAtaToken1, mint2, fwdAtaToken2, destAtaToken2);
        } catch (e) {
            console.error(e);
        }
        const destSolBalance = await connection.getBalance(destination.publicKey);
        const destToken1Balance = (await connection.getTokenAccountBalance(destAtaToken1)).value.uiAmount;
        const destToken2Balance = (await connection.getTokenAccountBalance(destAtaToken2)).value.uiAmount;

        expect(destSolBalance, "sol balance").to.equal(solAmount);
        expect(destToken1Balance, "token 1 balance").to.equal(token1Amount);
        expect(destToken2Balance, "token 2 balance").to.equal(token2Amount);
    });

    it("should create a token account for the destination if one does not exist", async () => {

        let tokenAmount = 1000;
        let forwardAta = await createAndFundAta(connection, payer, mint, mintAuthority, tokenAmount, forwardPda);
        const uninitialised = await getAssociatedTokenAddressSync(mint, destination.publicKey);
        try {
            await executeWithTokens(payer, program, connection, forwardAccount, forwardPda, destination, TOKEN_PROGRAM_ID, mint, forwardAta, uninitialised);
        } catch (e) {
            console.log(e)
        }
        const info = await connection.getTokenAccountBalance(uninitialised);
        expect(info.value.uiAmount).to.equal(tokenAmount);
    });
});
