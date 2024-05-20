import {Forward} from "./classes/classes";
import {expect} from "chai";
import {Connection, Keypair, PublicKey, SendTransactionError} from "@solana/web3.js";
import {createKeypairFromFile} from "./fns/createKeyPair";
import {beforeEach} from "mocha";
import {createMint} from "@solana/spl-token";
import {createForward, deriveForwardPda, execute} from "./fns/forwardFns";

const connection = new Connection(`http://localhost:8899`, 'confirmed');
const payer = createKeypairFromFile(require('os').homedir() + '/.config/solana/id.json');
const program = createKeypairFromFile('./target/deploy/solana_forward-keypair.json');
const mintAuthority = Keypair.generate();
const forwardId = 123456;

let destination, quarantine, mint, forwardPda, forwardBump;

beforeEach("setup", async () => {
    destination = Keypair.generate();
    quarantine = Keypair.generate();
});

describe("initialisation tests", () => {

    it("Should initialise forward", async () => {

        [forwardPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        await createForward(forwardPda, destination, quarantine, payer, program, forwardId, forwardBump, connection);

        const forwardInfo = await connection.getAccountInfo(forwardPda);
        const fwd= Forward.fromBuffer(forwardInfo.data);

        expect(fwd.id).to.equal(forwardId);
        expect(fwd.bump).to.equal(forwardBump);
        expect(new PublicKey(fwd.destination)).to.deep.equal(destination.publicKey);
        expect(new PublicKey(fwd.quarantine)).to.deep.equal(quarantine.publicKey);
    });

    it("Should require destination to exist", async () => {
        [forwardPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        try {
            await createForward(forwardPda, destination, quarantine, payer, program, forwardId, forwardBump, connection);
        } catch (e) {
            expect(e).to.be.an.instanceof(SendTransactionError)
        }

    });
});


