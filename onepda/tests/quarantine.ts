import {Connection, Keypair, LAMPORTS_PER_SOL,} from '@solana/web3.js';
import {deposit, initialiseAccountWithMinimumBalance} from "./fns/accounts";
import {createForward, deriveForwardPda, execute, quarantine, quarantineWithTokens} from "./fns/forwardFns";
import {createKeypairFromFile} from "./fns/createKeyPair";
import {beforeEach} from "mocha";
import {expect} from "chai";
import {createMint, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {createAndFundAta} from "./fns/createToken";

describe("quarantine instruction tests", () => {

    const connection = new Connection(`http://localhost:8899`, 'confirmed');
    const payer = createKeypairFromFile(require('os').homedir() + '/.config/solana/id.json');
    const program = createKeypairFromFile('./program/target/so/solana_forward-keypair.json');
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
        await createForward(forwardPda, destination.publicKey, quarantineAcc.publicKey, payer, program, forwardId, forwardBump, connection);
    });

    it ("Only the forward authority can quarantine funds", async () => {
        const someOtherAccount = Keypair.generate();
        await deposit(connection, payer, someOtherAccount.publicKey, LAMPORTS_PER_SOL/10);

        let quarantineAmount = LAMPORTS_PER_SOL/100;
        await deposit(connection, payer, forwardPda, quarantineAmount);
        try {
            await quarantine(someOtherAccount, program, connection, forwardPda, quarantineAcc, someOtherAccount)
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x9")
            return;
        }
        expect.fail("Should not have quarantined");
    });

    it ("The forward authority must sign to quarantine", async () => {
        const someOtherAccount = Keypair.generate();
        await deposit(connection, payer, someOtherAccount.publicKey, LAMPORTS_PER_SOL/10);

        let quarantineAmount = LAMPORTS_PER_SOL/100;
        await deposit(connection, payer, forwardPda, quarantineAmount);
        try {
            await quarantine(someOtherAccount, program, connection, forwardPda, quarantineAcc, payer, false)
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x9")
            return;
        }
        expect.fail("Should not have quarantined");
    });

    it("Should transfer sol when quarantined", async () => {
        let quarantineBalanceBefore = await connection.getBalance(quarantineAcc.publicKey);
        let quarantineAmount = LAMPORTS_PER_SOL/100;
        await deposit(connection, payer, forwardPda, quarantineAmount);
        await quarantine(payer, program, connection, forwardPda, quarantineAcc, payer)
        let quarantineBalanceAfter = await connection.getBalance(quarantineAcc.publicKey);
        expect(quarantineBalanceAfter - quarantineBalanceBefore).to.equal(quarantineAmount);
    });

    it("Should transfer tokens to quarantine when quarantined", async () =>{
        let quarantineAmount = 1000;
        let quarantineAta = await createAndFundAta(connection, payer, mint, mintAuthority, 0, quarantineAcc.publicKey);
        let forwardAta = await createAndFundAta(connection, payer, mint, mintAuthority, quarantineAmount, forwardPda);

        try {
            await quarantineWithTokens(payer, program, connection, forwardPda, quarantineAcc, payer, TOKEN_PROGRAM_ID, true, mint, forwardAta, quarantineAta);
        } catch (e) {
            console.log(e)
        }

        const info = await connection.getTokenAccountBalance(quarantineAta);
        expect(info.value.uiAmount).to.equal(quarantineAmount);
    });

    it ("Quarantine will not transfer sol or tokens if there are no funds", async () => {

        let quarantineBalanceBefore = await connection.getBalance(quarantineAcc.publicKey);
        let quarantineAta = await createAndFundAta(connection, payer, mint, mintAuthority, 0, quarantineAcc.publicKey);
        let forwardAta = await createAndFundAta(connection, payer, mint, mintAuthority, 0, forwardPda);

        let minBalance = await connection.getMinimumBalanceForRentExemption(0);
        expect(quarantineBalanceBefore).to.equal(minBalance);

        await quarantineWithTokens(payer, program, connection, forwardPda, quarantineAcc, payer, TOKEN_PROGRAM_ID, true, mint, forwardAta, quarantineAta);
        const info = await connection.getTokenAccountBalance(quarantineAta);
        expect(quarantineBalanceBefore).to.equal(minBalance);
        expect(info.value.uiAmount).to.equal(0);
    });

    it("Quarantine should forward sol and multiple tokens", async () => {
        const mintAuthority2 = Keypair.generate();
        let mint2 = await createMint(connection, payer, mintAuthority2.publicKey, null, 0);

        let solAmount = LAMPORTS_PER_SOL/200;
        let token1Amount = 300;
        let token2Amount = 400;

        const quarantineSolBalanceBefore = await connection.getBalance(quarantineAcc.publicKey);

        await deposit(connection, payer, forwardPda, solAmount);
        let fwdAtaToken1 = await createAndFundAta(connection, payer, mint, mintAuthority, token1Amount, forwardPda);
        let fwdAtaToken2 = await createAndFundAta(connection, payer, mint2, mintAuthority2, token2Amount, forwardPda);

        let quarantineAtaToken1 = await createAndFundAta(connection, payer, mint, mintAuthority, 0, quarantineAcc.publicKey);
        let quarantineAtaToken2 = await createAndFundAta(connection, payer, mint2, mintAuthority2, 0, quarantineAcc.publicKey);

        try {
            await quarantineWithTokens(payer, program, connection, forwardPda, quarantineAcc, payer, TOKEN_PROGRAM_ID, true, mint, fwdAtaToken1, quarantineAtaToken1, mint2, fwdAtaToken2, quarantineAtaToken2);
        } catch (e) {
            console.error(e);
        }
        const quarantineSolBalance = await connection.getBalance(quarantineAcc.publicKey);
        const quarantineToken1Balance = (await connection.getTokenAccountBalance(quarantineAtaToken1)).value.uiAmount;
        const quarantineToken2Balance = (await connection.getTokenAccountBalance(quarantineAtaToken2)).value.uiAmount;

        expect(quarantineSolBalance - quarantineSolBalanceBefore, "sol balance").to.equal(solAmount);
        expect(quarantineToken1Balance, "token 1 balance").to.equal(token1Amount);
        expect(quarantineToken2Balance, "token 2 balance").to.equal(token2Amount);
    });
});
