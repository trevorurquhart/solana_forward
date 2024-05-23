import {Connection, Keypair, LAMPORTS_PER_SOL, SendTransactionError, SystemProgram} from "@solana/web3.js";
import {deposit, initialiseAccountWithMinimumBalance} from "./fns/accounts";
import {createForward, deriveForwardPda, execute} from "./fns/forwardFns";
import {expect} from "chai";
import {createKeypairFromFile} from "./fns/createKeyPair";
import {beforeEach} from "mocha";
import {createAndFundAta} from "./fns/createToken";
import {createMint} from "@solana/spl-token";

const connection = new Connection(`http://localhost:8899`, 'confirmed');
const payer = createKeypairFromFile(require('os').homedir() + '/.config/solana/id.json');
const program = createKeypairFromFile('./target/deploy/solana_forward-keypair.json');
const forwardId = 123456;

let destination, quarantine, forwardPda, forwardBump, mint, mintAuthority;

describe("validation tests", () => {



    beforeEach("setup", async () => {
        destination = Keypair.generate();
        quarantine = Keypair.generate();
        mintAuthority = Keypair.generate();

        mint = await createMint(connection, payer, mintAuthority.publicKey, null, 0);

        await initialiseAccountWithMinimumBalance(connection, payer, destination.publicKey);
        [forwardPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        await createForward(forwardPda, destination.publicKey, quarantine, payer, program, forwardId, forwardBump, connection);
    });

    it("Should error if the token program id is incorrect", async () => {
        let forwardAmount = 1000;
        let destinationAta = await createAndFundAta(connection, payer, mint, mintAuthority, 0, destination.publicKey);
        let forwardAta = await createAndFundAta(connection, payer, mint, mintAuthority, forwardAmount, forwardPda);
        try {
            let notTheTokenProgram = SystemProgram.programId;
            await execute(payer, program, connection, forwardPda, destination, notTheTokenProgram, mint, forwardAta, destinationAta);
        } catch (e) {
            expect(e.message).to.contain("incorrect program id for instruction")
            return;
        }
        expect.fail("Should not have executed")
    });

    it("Should not transfer sol to an invalid destination", async () => {
        let forwardAmount = LAMPORTS_PER_SOL / 100;
        await deposit(connection, payer, forwardPda, forwardAmount);
        let invalidDestination = Keypair.generate();
        try {
            await execute(payer, program, connection, forwardPda, invalidDestination)
            expect.fail("Should not have executed")
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x2")
        }
    });
});

