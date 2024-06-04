import {Forward} from "./classes/classes";
import {expect} from "chai";
import {Connection, Keypair, PublicKey} from "@solana/web3.js";
import {createKeypairFromFile} from "./fns/createKeyPair";
import {beforeEach} from "mocha";
import {createForward, deriveForwardPda} from "./fns/forwardFns";
import {ASSOCIATED_TOKEN_PROGRAM_ID, createMint} from "@solana/spl-token";
import {createAndFundAta} from "./fns/createToken";
import {initialiseAccountWithMinimumBalance} from "./fns/accounts";

const connection = new Connection(`http://localhost:8899`, 'confirmed');
const payer = createKeypairFromFile(require('os').homedir() + '/.config/solana/id.json');
const program = createKeypairFromFile('./program/target/so/solana_forward_childpda-keypair.json');
const forwardId = 123456;

let destination, forwardAccount, forwardPda, forwardBump;

beforeEach("setup", async () => {
    destination = Keypair.generate();
    forwardAccount = Keypair.generate();
});

describe("create instruction tests", () => {

    it("Should create forward", async () => {

        [forwardPda, forwardBump] = deriveForwardPda(forwardAccount.publicKey, program.publicKey);
        try {
            await createForward(forwardAccount, destination.publicKey, forwardBump, forwardPda, program, payer, connection);
        } catch (e) {
            console.log(e);
            expect.fail("Should have created forward");
            return;
        }
        const forwardInfo = await connection.getAccountInfo(forwardAccount.publicKey);
        const fwd = Forward.fromBuffer(forwardInfo.data);

        expect(new PublicKey(fwd.destination), "destination").to.deep.equal(destination.publicKey);
        expect(new PublicKey(fwd.forwardPda), "forward account").to.deep.equal(forwardPda);
        expect(new PublicKey(fwd.authority), "auhority").to.deep.equal(payer.publicKey);
        expect(fwd.bump).to.equal(forwardBump);
    });

    it("Should not create forward if already exists", async () => {
        [forwardPda, forwardBump] = deriveForwardPda(forwardAccount.publicKey, program.publicKey);
        try {
            await createForward(forwardAccount, destination.publicKey, forwardBump, forwardPda, program, payer, connection);
        } catch (e) {
            console.log(e);
            expect.fail("Should have created forward");
            return;
        }
        try {
            await createForward(forwardAccount, destination.publicKey, forwardBump, forwardPda, program, payer, connection);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x6")
            return;
        }
    });

    it ("Should create multiple forwards for one destination", async () => {

        const forwardAccount2 = Keypair.generate();
        const [forwardPda1, forwardBump1] = deriveForwardPda(forwardAccount.publicKey, program.publicKey);
        const [forwardPda2, forwardBump2] = deriveForwardPda(forwardAccount2.publicKey, program.publicKey);
        try {
            await createForward(forwardAccount, destination.publicKey, forwardBump1, forwardPda1, program, payer, connection);
            await createForward(forwardAccount2, destination.publicKey, forwardBump2, forwardPda2, program, payer, connection);
        } catch (e) {
            console.log(e)
            expect.fail("Should have created forward");
            return;
        }
        const forwardInfo1 = await connection.getAccountInfo(forwardAccount.publicKey);
        const forwardInfo2 = await connection.getAccountInfo(forwardAccount2.publicKey);
        const fwd1 = Forward.fromBuffer(forwardInfo1.data);
        const fwd2 = Forward.fromBuffer(forwardInfo2.data);

        expect(new PublicKey(fwd1.destination), "destination").to.deep.equal(destination.publicKey);
        expect(new PublicKey(fwd1.forwardPda), "forward account").to.deep.equal(forwardPda1);
        expect(new PublicKey(fwd1.authority), "auhority").to.deep.equal(payer.publicKey);
        expect(fwd1.bump).to.equal(forwardBump1);

        expect(new PublicKey(fwd2.destination), "destination").to.deep.equal(destination.publicKey);
        expect(new PublicKey(fwd2.forwardPda), "forward account").to.deep.equal(forwardPda2);
        expect(new PublicKey(fwd2.authority), "auhority").to.deep.equal(payer.publicKey);
        expect(fwd2.bump).to.equal(forwardBump2);

    });

    it("The destination account should not be an ATA", async () => {
        const mintAuthority = Keypair.generate();
        const mint = await createMint(connection, payer, mintAuthority.publicKey, null, 0);
        let destAtaToken1 = await createAndFundAta(mint, destination.publicKey, 10, payer, mintAuthority, connection);
        const [forwardToTokenPda, forwardBump] = deriveForwardPda(destAtaToken1, program.publicKey);
        try {
            await createForward(forwardAccount, destAtaToken1, forwardBump, forwardToTokenPda, program, payer, connection);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x1")
            return;
        }
        expect.fail("Should not have created forward")
    });

    it("Should fail to re-initialise the forward with a different destination", async () => {

        [forwardPda, forwardBump] = deriveForwardPda(forwardAccount.publicKey, program.publicKey);
        try {
            await createForward(forwardAccount, destination.publicKey, forwardBump, forwardPda, program, payer, connection);
        } catch (e) {
            console.log(e);
            expect.fail("Should have created forward")
            return;
        }
        const bogusDestination = Keypair.generate();
        await initialiseAccountWithMinimumBalance(bogusDestination.publicKey, payer, connection);
        try {
            await createForward(forwardAccount, bogusDestination.publicKey, forwardBump, forwardPda, program, payer, connection);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x6")
            return;
        }
        expect.fail("Should not have created forward")
    });

    it("Should error if the forward pda does not match the derived pda", async () => {
        const bogusPda = Keypair.generate();
        [forwardPda, forwardBump] = deriveForwardPda(forwardAccount.publicKey, program.publicKey);

        try {
            await createForward(forwardAccount, destination.publicKey, forwardBump, bogusPda.publicKey, program, payer, connection);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x7")
            return;
        }
        expect.fail("Should not have created forward")
    });

    it("Should error if the system program is not the system program", async () => {
        // noinspection UnnecessaryLocalVariableJS
        const bogusSystemProgram = ASSOCIATED_TOKEN_PROGRAM_ID;
        [forwardPda, forwardBump] = deriveForwardPda(forwardAccount.publicKey, program.publicKey);

        try {
            await createForward(forwardAccount, destination.publicKey, forwardBump, forwardPda, program, payer, connection, bogusSystemProgram);
        } catch (e) {
            expect(e.message).to.contain("incorrect program id for instruction")
            return;
        }
        expect.fail("Should not have created forward")
    });
});


