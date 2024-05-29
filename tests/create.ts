import {Forward} from "./classes/classes";
import {expect} from "chai";
import {Connection, Keypair, LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
import {createKeypairFromFile} from "./fns/createKeyPair";
import {beforeEach} from "mocha";
import {createForward, deriveForwardPda} from "./fns/forwardFns";
import {deposit, initialiseAccountWithMinimumBalance} from "./fns/accounts";
import {createAndFundAta} from "./fns/createToken";
import {ASSOCIATED_TOKEN_PROGRAM_ID, createMint} from "@solana/spl-token";

const connection = new Connection(`http://localhost:8899`, 'confirmed');
const payer = createKeypairFromFile(require('os').homedir() + '/.config/solana/id.json');
const program = createKeypairFromFile('./target/deploy/solana_forward-keypair.json');
const forwardId = 123456;

let destination, quarantine, forwardPda, forwardBump;

beforeEach("setup", async () => {
    destination = Keypair.generate();
    quarantine = Keypair.generate();
    await initialiseAccountWithMinimumBalance(connection, payer, destination.publicKey);
    await initialiseAccountWithMinimumBalance(connection, payer, quarantine.publicKey);
});

describe("create instruction tests", () => {

    it("Should create forward", async () => {

        [forwardPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        try {
            await createForward(forwardPda, destination.publicKey, quarantine.publicKey, payer, program, forwardId, forwardBump, connection);
        } catch (e) {
            expect.fail("Should have created forward");
            return;
        }

        const forwardInfo = await connection.getAccountInfo(forwardPda);
        const fwd = Forward.fromBuffer(forwardInfo.data);

        expect(fwd.id).to.equal(forwardId);
        expect(fwd.bump).to.equal(forwardBump);
        expect(new PublicKey(fwd.destination)).to.deep.equal(destination.publicKey);
        expect(new PublicKey(fwd.quarantine)).to.deep.equal(quarantine.publicKey);
        expect(new PublicKey(fwd.authority)).to.deep.equal(payer.publicKey);
    });

    it("Should not create forward if already exists", async () => {
        [forwardPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        try {
            await createForward(forwardPda, destination.publicKey, quarantine.publicKey, payer, program, forwardId, forwardBump, connection);
        } catch (e) {
            expect.fail("Should have created forward");
            return;
        }
        try {
            await createForward(forwardPda, destination.publicKey, quarantine.publicKey, payer, program, forwardId, forwardBump, connection);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x6")
            return;
        }
    });

    it ("Should create multiple forwards for one destination", async () => {
        const forwardId1 = 100;
        const forwardId2 = 200;
        const [forwardPda1, forwardBump1] = deriveForwardPda(destination.publicKey, forwardId1, program.publicKey);
        const [forwardPda2, forwardBump2] = deriveForwardPda(destination.publicKey, forwardId2, program.publicKey);
        try {
            await createForward(forwardPda1, destination.publicKey, quarantine.publicKey, payer, program, forwardId1, forwardBump1, connection);
            await createForward(forwardPda2, destination.publicKey, quarantine.publicKey, payer, program, forwardId2, forwardBump2, connection);
        } catch (e) {
            console.log(e)
            expect.fail("Should have created forward");
            return;
        }
        const forwardInfo1 = await connection.getAccountInfo(forwardPda1);
        const forwardInfo2 = await connection.getAccountInfo(forwardPda2);
        const fwd1 = Forward.fromBuffer(forwardInfo1.data);
        const fwd2 = Forward.fromBuffer(forwardInfo2.data);
        expect(fwd1.id).to.equal(forwardId1);
        expect(fwd2.id).to.equal(forwardId2);
    });

    it("Should require destination to exist", async () => {
        const uninitialisedDestination = Keypair.generate();
        [forwardPda, forwardBump] = deriveForwardPda(uninitialisedDestination.publicKey, forwardId, program.publicKey);
        try {
            await createForward(forwardPda, uninitialisedDestination.publicKey, quarantine.publicKey, payer, program, forwardId, forwardBump, connection);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x0")
            return;
        }
        expect.fail("Should not have created forward")
    });

    it("Should require quarantine to exist", async () => {
        const uninitialisedQuarantine = Keypair.generate();
        [forwardPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        try {
            await createForward(forwardPda, destination.publicKey, uninitialisedQuarantine.publicKey, payer, program, forwardId, forwardBump, connection);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x8")
            return;
        }
        expect.fail("Should not have created forward")
    });

    it("The destination account should not be an ATA", async () => {
        const mintAuthority = Keypair.generate();
        const mint = await createMint(connection, payer, mintAuthority.publicKey, null, 0);
        let destAtaToken1 = await createAndFundAta(connection, payer, mint, mintAuthority, 0, destination.publicKey);
        const [forwardToTokenPda, forwardBump] = deriveForwardPda(destAtaToken1, forwardId, program.publicKey);
        try {
            await createForward(forwardToTokenPda, destAtaToken1, quarantine.publicKey, payer, program, forwardId, forwardBump, connection);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x1")
            return;
        }
        expect.fail("Should not have created forward")
    });

    it("The quarantine account should not be an ATA", async () => {
        const mintAuthority = Keypair.generate();
        const mint = await createMint(connection, payer, mintAuthority.publicKey, null, 0);
        let quarantineAtaToken1 = await createAndFundAta(connection, payer, mint, mintAuthority, 0, quarantine.publicKey);
        const [forwardToTokenPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        try {
            await createForward(forwardToTokenPda, destination.publicKey, quarantineAtaToken1, payer, program, forwardId, forwardBump, connection);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x2");
            return;
        }
        expect.fail("Should not have created forward")
    });

    it("Should fail to re-initialise the forward with a different destination", async () => {
        [forwardPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        await createForward(forwardPda, destination.publicKey, quarantine.publicKey, payer, program, forwardId, forwardBump, connection);
        const bogusDestination = Keypair.generate();
        await initialiseAccountWithMinimumBalance(connection, payer, bogusDestination.publicKey);
        try {
            await createForward(forwardPda, bogusDestination.publicKey, quarantine.publicKey, payer, program, forwardId, forwardBump, connection);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x6")
            return;
        }
        expect.fail("Should not have created forward")
    });

    it("Should error if the forward pda does not match the derived pda", async () => {
        const bogusPda = Keypair.generate();
        try {
            await createForward(bogusPda.publicKey, destination.publicKey, quarantine.publicKey, payer, program, forwardId, forwardBump, connection);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x7")
            return;
        }
        expect.fail("Should not have created forward")
    });

    it("Should error if the system program is not the system program", async () => {
        // noinspection UnnecessaryLocalVariableJS
        const bogusSystemProgram = ASSOCIATED_TOKEN_PROGRAM_ID;
        try {
            await createForward(forwardPda,
                destination.publicKey,
                quarantine.publicKey,
                payer,
                program,
                forwardId,
                forwardBump,
                connection,
                bogusSystemProgram);
        } catch (e) {
            expect(e.message).to.contain("incorrect program id for instruction")
            return;
        }
        expect.fail("Should not have created forward")
    });

    it("Should deposit to forward", async () => {
        let depositAmount = LAMPORTS_PER_SOL/100;
        let balanceBefore = await connection.getBalance(forwardPda);
        await deposit(connection, payer, forwardPda, depositAmount);
        let balanceAfter = await connection.getBalance(forwardPda);
        expect(balanceAfter - balanceBefore).to.equal(depositAmount);
    });

    it("Should deposit tokens to forward", async () =>{
        const mintAuthority = Keypair.generate();
        const mint = await createMint(connection, payer, mintAuthority.publicKey, null, 0);
        let tokenAmount = 1000;
        let forwardAta = await createAndFundAta(connection, payer, mint, mintAuthority, tokenAmount, forwardPda);
        const info = await connection.getTokenAccountBalance(forwardAta);
        expect(info.value.uiAmount).to.equal(tokenAmount);
    });

});


