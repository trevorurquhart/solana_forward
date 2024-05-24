import {Connection, Keypair, LAMPORTS_PER_SOL,} from '@solana/web3.js';
import {deposit, initialiseAccountWithMinimumBalance} from "./fns/accounts";
import {createForward, deriveForwardPda, quarantine} from "./fns/forwardFns";
import {createKeypairFromFile} from "./fns/createKeyPair";
import {beforeEach} from "mocha";
import {expect} from "chai";
import {createMint} from "@solana/spl-token";

describe("execute quarantine tests", () => {

    const connection = new Connection(`http://localhost:8899`, 'confirmed');
    const payer = createKeypairFromFile(require('os').homedir() + '/.config/solana/id.json');
    const program = createKeypairFromFile('./target/deploy/solana_forward-keypair.json');
    const mintAuthority = Keypair.generate();
    const forwardId = 123456;

    let destination, quarantineAcc, mint, forwardPda, forwardBump;

    beforeEach("setup", async () => {
        destination = Keypair.generate();
        quarantineAcc = Keypair.generate();
        await initialiseAccountWithMinimumBalance(connection, payer, destination.publicKey);
        await initialiseAccountWithMinimumBalance(connection, payer, quarantineAcc.publicKey);
        mint = await createMint(connection, payer, mintAuthority.publicKey, null, 0);
        [forwardPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        await createForward(forwardPda, destination.publicKey, quarantineAcc, payer, program, forwardId, forwardBump, connection);
    });

    it("Should transfer sol to quarantine when executed", async () => {
        let quarantineBalanceBefore = await connection.getBalance(quarantineAcc.publicKey);
        let forwardAmount = LAMPORTS_PER_SOL/100;
        await deposit(connection, payer, forwardPda, forwardAmount);
        await quarantine(payer, program, connection, forwardPda, quarantineAcc, payer)
        let quarantineBalanceAfter = await connection.getBalance(quarantineAcc.publicKey);
        expect(quarantineBalanceAfter - quarantineBalanceBefore).to.equal(forwardAmount);
    });

    it ("Only the forward authority can quarantine funds", async () => {
        const someOtherAccount = Keypair.generate();
        await deposit(connection, payer, someOtherAccount.publicKey, LAMPORTS_PER_SOL/10);

        let forwardAmount = LAMPORTS_PER_SOL/100;
        await deposit(connection, payer, forwardPda, forwardAmount);
        try {
            await quarantine(someOtherAccount, program, connection, forwardPda, quarantineAcc, someOtherAccount)
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x8")
            return;
        }
        expect.fail("Should not have quarantined");
    });

    it ("The forward authority must sign to quarantine", async () => {
        const someOtherAccount = Keypair.generate();
        await deposit(connection, payer, someOtherAccount.publicKey, LAMPORTS_PER_SOL/10);

        let forwardAmount = LAMPORTS_PER_SOL/100;
        await deposit(connection, payer, forwardPda, forwardAmount);
        try {
            await quarantine(someOtherAccount, program, connection, forwardPda, quarantineAcc, payer, false)
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x8")
            return;
        }
        expect.fail("Should not have quarantined");
    });

    //
    // it("Should deposit tokens to forward", async () =>{
    //     let tokenAmount = 1000;
    //     let forwardAta = await createAndFundAta(connection, payer, mint, mintAuthority, tokenAmount, forwardPda);
    //     const info = await connection.getTokenAccountBalance(forwardAta);
    //     expect(info.value.uiAmount).to.equal(tokenAmount);
    // });
    //
    // it("Should transfer tokens when executed", async () =>{
    //     let forwardAmount = 1000;
    //     let destinationAta = await createAndFundAta(connection, payer, mint, mintAuthority, 0, destination.publicKey);
    //     let forwardAta = await createAndFundAta(connection, payer, mint, mintAuthority, forwardAmount, forwardPda);
    //     try {
    //         await execute(payer, program, connection, forwardPda, destination, TOKEN_PROGRAM_ID, mint, forwardAta, destinationAta);
    //     } catch (e) {
    //         console.log(e)
    //     }
    //     const info = await connection.getTokenAccountBalance(destinationAta);
    //     expect(info.value.uiAmount).to.equal(forwardAmount);
    // });
    //
    // it ("Will not transfer if the forward is empty", async () => {
    //
    //     let destinationBalanceBefore = await connection.getBalance(destination.publicKey);
    //     let destinationAta = await createAndFundAta(connection, payer, mint, mintAuthority, 0, destination.publicKey);
    //     let forwardAta = await createAndFundAta(connection, payer, mint, mintAuthority, 0, forwardPda);
    //
    //
    //     let minBalance = await connection.getMinimumBalanceForRentExemption(0);
    //     expect(destinationBalanceBefore).to.equal(minBalance);
    //
    //     await execute(payer, program, connection, forwardPda, destination, TOKEN_PROGRAM_ID, mint, forwardAta, destinationAta);
    //     const info = await connection.getTokenAccountBalance(destinationAta);
    //     expect(destinationBalanceBefore).to.equal(minBalance);
    //     expect(info.value.uiAmount).to.equal(0);
    // });
    //
    // it("Should forward sol and multiple tokens", async () => {
    //     const mintAuthority2 = Keypair.generate();
    //     let mint2 = await createMint(connection, payer, mintAuthority2.publicKey, null, 0);
    //
    //     let solAmount = LAMPORTS_PER_SOL/200;
    //     let token1Amount = 300;
    //     let token2Amount = 400;
    //
    //     await deposit(connection, payer, destination.publicKey, LAMPORTS_PER_SOL);
    //     const destSolBalanceBefore = await connection.getBalance(destination.publicKey);
    //
    //     await deposit(connection, payer, forwardPda, solAmount);
    //     let fwdAtaToken1 = await createAndFundAta(connection, payer, mint, mintAuthority, token1Amount, forwardPda);
    //     let fwdAtaToken2 = await createAndFundAta(connection, payer, mint2, mintAuthority2, token2Amount, forwardPda);
    //
    //     let destAtaToken1 = await createAndFundAta(connection, payer, mint, mintAuthority, 0, destination.publicKey);
    //     let destAtaToken2 = await createAndFundAta(connection, payer, mint2, mintAuthority2, 0, destination.publicKey);
    //
    //     try {
    //         await execute(payer, program, connection, forwardPda, destination, TOKEN_PROGRAM_ID, mint, fwdAtaToken1, destAtaToken1, mint2, fwdAtaToken2, destAtaToken2);
    //     } catch (e) {
    //         console.error(e);
    //     }
    //     const destSolBalance = await connection.getBalance(destination.publicKey);
    //     const destToken1Balance = (await connection.getTokenAccountBalance(destAtaToken1)).value.uiAmount;
    //     const destToken2Balance = (await connection.getTokenAccountBalance(destAtaToken2)).value.uiAmount;
    //
    //     expect(destSolBalance - destSolBalanceBefore, "sol balance").to.equal(solAmount);
    //     expect(destToken1Balance, "token 1 balance").to.equal(token1Amount);
    //     expect(destToken2Balance, "token 2 balance").to.equal(token2Amount);
    // });
});
