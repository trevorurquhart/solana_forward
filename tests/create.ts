import {Forward} from "./classes/classes";
import {expect  } from "chai";
import {Connection, Keypair, PublicKey, SendTransactionError} from "@solana/web3.js";
import {createKeypairFromFile} from "./fns/createKeyPair";
import {beforeEach} from "mocha";
import {createForward, deriveForwardPda} from "./fns/forwardFns";
import {deposit, initialiseAccountWithMinimumBalance} from "./fns/accounts";
import {createAndFundAta} from "./fns/createToken";
import {createMint} from "@solana/spl-token";

const connection = new Connection(`http://localhost:8899`, 'confirmed');
const payer = createKeypairFromFile(require('os').homedir() + '/.config/solana/id.json');
const program = createKeypairFromFile('./target/deploy/solana_forward-keypair.json');
const mintAuthority = Keypair.generate();
const forwardId = 123456;

let destination, quarantine, mint, forwardPda, forwardBump;

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
            expect.fail("Should have created forward");
        }

        const forwardInfo = await connection.getAccountInfo(forwardPda);
        const fwd= Forward.fromBuffer(forwardInfo.data);

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

});


