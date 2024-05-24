import {Forward} from "./classes/classes";
import {expect} from "chai";
import {Connection, Keypair, PublicKey} from "@solana/web3.js";
import {createKeypairFromFile} from "./fns/createKeyPair";
import {beforeEach} from "mocha";
import {createForward, deriveForwardPda} from "./fns/forwardFns";
import {initialiseAccountWithMinimumBalance} from "./fns/accounts";
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
});

describe("create instruction tests", () => {

    it("Should create forward", async () => {

        [forwardPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        try {
            await createForward(forwardPda, destination.publicKey, quarantine, payer, program, forwardId, forwardBump, connection);
        } catch (e) {
            console.log(e)
            expect.fail("Should have created forward");
        }

        const forwardInfo = await connection.getAccountInfo(forwardPda);
        const fwd = Forward.fromBuffer(forwardInfo.data);

        expect(fwd.id).to.equal(forwardId);
        expect(fwd.bump).to.equal(forwardBump);
        expect(new PublicKey(fwd.destination)).to.deep.equal(destination.publicKey);
        expect(new PublicKey(fwd.quarantine)).to.deep.equal(quarantine.publicKey);
    });

    it("Should require destination to exist", async () => {
        const uninitialisedDestination = Keypair.generate();
        [forwardPda, forwardBump] = deriveForwardPda(uninitialisedDestination.publicKey, forwardId, program.publicKey);
        try {
            await createForward(forwardPda, uninitialisedDestination.publicKey, quarantine, payer, program, forwardId, forwardBump, connection);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x0")
            return;
        }
        expect.fail("Should not have created forward")
    });

    it("The destination should not be an ATA", async () => {
        const mintAuthority = Keypair.generate();
        const mint = await createMint(connection, payer, mintAuthority.publicKey, null, 0);
        let destAtaToken1 = await createAndFundAta(connection, payer, mint, mintAuthority, 0, destination.publicKey);
        const [forwardToTokenPda, forwardBump] = deriveForwardPda(destAtaToken1, forwardId, program.publicKey);
        try {
            await createForward(forwardToTokenPda, destAtaToken1, quarantine, payer, program, forwardId, forwardBump, connection);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x1")
            return;
        }
        expect.fail("Should not have created forward")
    });

    it("Should fail to re-initialise the forward with a different destination", async () => {
        [forwardPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        await createForward(forwardPda, destination.publicKey, quarantine, payer, program, forwardId, forwardBump, connection);
        const bogusDestination = Keypair.generate();
        await initialiseAccountWithMinimumBalance(connection, payer, bogusDestination.publicKey);
        try {
            await createForward(forwardPda, bogusDestination.publicKey, quarantine, payer, program, forwardId, forwardBump, connection);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x5")
            return;
        }
        expect.fail("Should not have created forward")
    });

    it("Should error if the forward pda does not match the derived pda", async () => {
        const bogusPda = Keypair.generate();
        try {
            await createForward(bogusPda.publicKey, destination.publicKey, quarantine, payer, program, forwardId, forwardBump, connection);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x6")
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
                quarantine,
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

});


