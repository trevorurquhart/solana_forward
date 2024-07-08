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
        await createForward(forwardAccount, destination.publicKey, forwardBump, forwardPda, program, payer, connection);
    });

    it("Should transfer sol when executed", async () => {

        let forwardAmount = LAMPORTS_PER_SOL / 100;
        await deposit(payer, destination.publicKey, LAMPORTS_PER_SOL * 3, connection)
        await deposit(payer, forwardPda, forwardAmount, connection);

        let destinationBalanceBefore = await connection.getBalance(destination.publicKey);
        try {
            await execute(forwardPda, destination, forwardAccount.publicKey, program, payer, connection)
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
            await executeWithTokens(forwardPda, destination, forwardAccount.publicKey, program, payer, connection, TOKEN_PROGRAM_ID, mint, forwardAta, destinationAta);
        } catch (e) {
            console.log(e)
            expect.fail("Should have executed");
        }
        const info = await connection.getTokenAccountBalance(destinationAta);
        expect(info.value.uiAmount).to.equal(forwardAmount);
    });

    it("Should transfer tokens using the token 2022 program", async() => {

        const mint2022Token = await createMint(connection, payer, mintAuthority.publicKey, null, 0, Keypair.generate(),  undefined, TOKEN_2022_PROGRAM_ID);
        const destinationAta = getAssociatedTokenAddressSync(mint2022Token, destination.publicKey, false, TOKEN_2022_PROGRAM_ID);

        let forwardAmount = 1000;
        let forwardAta = await createAndFundAta(mint2022Token, forwardPda, forwardAmount, payer, mintAuthority, connection, TOKEN_2022_PROGRAM_ID);
        const ataInfo = await connection.getTokenAccountBalance(forwardAta);
        expect(ataInfo.value.uiAmount).to.equal(forwardAmount);

        try {
            await executeWithTokens(forwardPda, destination, forwardAccount.publicKey, program, payer, connection, TOKEN_2022_PROGRAM_ID, mint2022Token, forwardAta, destinationAta);
        } catch (e) {
            console.log(e)
            expect.fail("Should have executed");
        }
        const info = await connection.getTokenAccountBalance(destinationAta);
        expect(info.value.uiAmount).to.equal(forwardAmount);
    });

    it("Execute will not transfer sol or tokens if there are no funds", async () => {

        let destinationTokenBalanceBefore = 1000;
        let destinationSolBalanceBefore = LAMPORTS_PER_SOL/ 200;

        await deposit(payer, destination.publicKey, destinationSolBalanceBefore, connection);
        let destinationAta = await createAndFundAta(mint, destination.publicKey, destinationTokenBalanceBefore, payer, mintAuthority, connection);

        const forwardAta = await createAndFundAta(mint, forwardPda, 0, payer, mintAuthority, connection);

        try {
            await executeWithTokens(forwardPda, destination, forwardAccount.publicKey, program, payer, connection, TOKEN_PROGRAM_ID, mint, forwardAta, destinationAta);
        } catch (e) {
            console.log(e)
            expect.fail("Should have executed");
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

        await deposit(payer, forwardPda, solAmount, connection);
        let fwdAtaToken1 = await createAndFundAta(mint, forwardPda, token1Amount, payer, mintAuthority, connection);
        let fwdAtaToken2 = await createAndFundAta(mint2, forwardPda, token2Amount, payer, mintAuthority2, connection);

        const destAtaToken1 = await getAssociatedTokenAddressSync(mint, destination.publicKey);
        const destAtaToken2 = await getAssociatedTokenAddressSync(mint2, destination.publicKey);


        try {
            await executeWithTokens(forwardPda, destination, forwardAccount.publicKey, program, payer, connection, TOKEN_PROGRAM_ID, mint, fwdAtaToken1, destAtaToken1, mint2, fwdAtaToken2, destAtaToken2);
        } catch (e) {
            console.error(e);
            expect.fail("Should have executed");
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
        let forwardAta = await createAndFundAta(mint, forwardPda, tokenAmount, payer, mintAuthority, connection);
        const uninitialised = await getAssociatedTokenAddressSync(mint, destination.publicKey);
        try {
            await executeWithTokens(forwardPda, destination, forwardAccount.publicKey, program, payer, connection, TOKEN_PROGRAM_ID, mint, forwardAta, uninitialised);
        } catch (e) {
            console.log(e)
        }
        const info = await connection.getTokenAccountBalance(uninitialised);
        expect(info.value.uiAmount).to.equal(tokenAmount);
    });
});
