import {Connection, Keypair, LAMPORTS_PER_SOL, SendTransactionError} from "@solana/web3.js";
import {deposit, initialiseSystemAccount} from "./fns/accounts";
import {createForward, deriveForwardPda, execute} from "./fns/forwardFns";
import {expect} from "chai";
import {createKeypairFromFile} from "./fns/createKeyPair";
import {beforeEach} from "mocha";

const connection = new Connection(`http://localhost:8899`, 'confirmed');
const payer = createKeypairFromFile(require('os').homedir() + '/.config/solana/id.json');
const program = createKeypairFromFile('./target/deploy/solana_forward-keypair.json');
const forwardId = 123456;

let destination, quarantine, forwardPda, forwardBump;

describe("validation tests", () => {

    beforeEach("setup", async () => {
        destination = Keypair.generate();
        quarantine = Keypair.generate();
        await initialiseSystemAccount(connection, payer, destination.publicKey);
        [forwardPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        await createForward(forwardPda, destination, quarantine, payer, program, forwardId, forwardBump, connection);
    });

    it("Should not transfer sol to an invalid destination", async () => {
        let forwardAmount = LAMPORTS_PER_SOL / 100;
        await deposit(connection, payer, forwardPda, forwardAmount);
        let invalidDestination = Keypair.generate();
        try {
            await execute(payer, program, connection, forwardPda, invalidDestination)
            expect.fail("Should not have executed")
        } catch (e) {
            expect(e.message).to.contain("custom program error: 0x1")
        }
    });
});

