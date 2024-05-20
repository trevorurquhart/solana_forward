import {Connection, Keypair, LAMPORTS_PER_SOL, SendTransactionError} from "@solana/web3.js";
import {deposit} from "./fns/deposit";
import {createForward, deriveForwardPda, execute} from "./fns/forwardFns";
import {expect} from "chai";
import {createKeypairFromFile} from "./fns/createKeyPair";
import {beforeEach} from "mocha";
import {createMint} from "@solana/spl-token";

const connection = new Connection(`http://localhost:8899`, 'confirmed');
const payer = createKeypairFromFile(require('os').homedir() + '/.config/solana/id.json');
const program = createKeypairFromFile('./target/deploy/solana_forward-keypair.json');
const mintAuthority = Keypair.generate();
const forwardId = 123456;

let destination, quarantine, mint, forwardPda, forwardBump;

describe("validation tests", () => {

    beforeEach("setup", async () => {
        destination = Keypair.generate();
        quarantine = Keypair.generate();
        mint = await createMint(connection, payer, mintAuthority.publicKey, null, 0);
        [forwardPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        await createForward(forwardPda, destination, quarantine, payer, program, forwardId, forwardBump, connection);
    });

    it("Should not transfer sol to an invalid destination", async () => {
        let forwardAmount = LAMPORTS_PER_SOL / 100;
        await deposit(connection, payer, forwardPda, forwardAmount);
        let invalidDestination = Keypair.generate();
        try {
            await execute(payer, program, connection, forwardPda, destination)
        } catch (e) {
            expect(e).to.be.an.instanceof(SendTransactionError)
        }
    });
});

