import {Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram} from "@solana/web3.js";
import {deposit, initialiseAccountWithMinimumBalance} from "./fns/accounts";
import {createForward, deriveForwardPda, execute, executeWithTokens} from "./fns/forwardFns";
import {expect} from "chai";
import {createKeypairFromFile} from "./fns/createKeyPair";
import {beforeEach} from "mocha";
import {createAndFundAta} from "./fns/createToken";
import {createMint, TOKEN_PROGRAM_ID} from "@solana/spl-token";

const connection = new Connection(`http://localhost:8899`, 'confirmed');
const payer = createKeypairFromFile(require('os').homedir() + '/.config/solana/id.json');
const program = createKeypairFromFile('./program/target/so/solana_forward-keypair.json');
const forwardId = 123456;

let destination, forwardPda, forwardBump, mint, mintAuthority;

describe("execute validation tests", () => {

    beforeEach("setup", async () => {
        destination = Keypair.generate();
        mintAuthority = Keypair.generate();

        mint = await createMint(connection, payer, mintAuthority.publicKey, null, 0);

        await initialiseAccountWithMinimumBalance(destination.publicKey, payer, connection);
        [forwardPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        await createForward(forwardId, destination.publicKey, forwardBump, forwardPda, program, payer, connection);
    });

    it("Should error if the token program id is incorrect", async () => {
        let forwardAmount = 1000;
        let destinationAta = await createAndFundAta(mint, destination.publicKey, 0, payer, mintAuthority, connection);
        let forwardAta = await createAndFundAta(mint, forwardPda, forwardAmount, payer, mintAuthority, connection);
        try {
            let notTheTokenProgram = SystemProgram.programId;
            await executeWithTokens(forwardPda, destination, program, payer, connection, notTheTokenProgram, mint, forwardAta, destinationAta);
        } catch (e) {
            expect(e.message).to.contain("incorrect program id for instruction")
            return;
        }
        expect.fail("Should not have executed")
    });

    it("Should not transfer sol to an invalid destination", async () => {
        let forwardAmount = LAMPORTS_PER_SOL / 100;
        await deposit(payer, forwardPda, forwardAmount, connection);
        let invalidDestination = Keypair.generate();
        try {
            await execute(forwardPda, invalidDestination, program, payer, connection)
            expect.fail("Should not have executed")
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x2")
        }
    });

    it("Should not transfer tokens from an invalid ATA", async () => {
        let destinationAta = await createAndFundAta(mint, destination.publicKey, 0, payer, mintAuthority, connection);
        let invalidForwardAta = Keypair.generate();
        try {
            await executeWithTokens(forwardPda, destination, program, payer, connection, TOKEN_PROGRAM_ID, mint, invalidForwardAta.publicKey, destinationAta);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x3")
            return;
        }
        expect.fail("Should not have executed")
    });

    it("Should not transfer tokens to an invalid ATA", async () => {
        let forwardAmount = 1000;
        let forwardAta = await createAndFundAta(mint, forwardPda, forwardAmount, payer, mintAuthority, connection);
        let invalidDestination = Keypair.generate();
        try {
            await executeWithTokens(forwardPda, destination, program, payer, connection, TOKEN_PROGRAM_ID, mint, forwardAta, invalidDestination.publicKey);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x4")
            return;
        }
        expect.fail("Should not have executed")
    });

    it ("Should not transfer from an invalid forward", async () => {
        let invalidForward = Keypair.generate();
        try {
            await execute(invalidForward.publicKey, destination, program, payer, connection);
        } catch (e) {
            expect(e.message).to.contain("incorrect program id for instruction")
            return;
        }
        expect.fail("Should not have executed");
    });

    it("Should error if the number of accounts is invalid", async () => {
        let forwardAmount = 1000;
        let forwardAta = await createAndFundAta(mint, forwardPda, forwardAmount, payer, mintAuthority, connection);
        try {
            await executeWithTokens(forwardPda, destination, program, payer, connection, TOKEN_PROGRAM_ID, mint, forwardAta);
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x7")
            return;
        }
        expect.fail("Should not have executed")
    });
});