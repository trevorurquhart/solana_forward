import {Connection, Keypair, LAMPORTS_PER_SOL, PublicKey,} from '@solana/web3.js';
import {deposit} from "./fns/deposit";
import {createForward, derivePageVisitsPda} from "./fns/forwardFns";
import {createKeypairFromFile} from "./fns/createKeyPair";
import {Forward} from "./classes/classes";
import {beforeEach} from "mocha";
import {expect} from "chai";

describe("forward tests", () => {

    const connection = new Connection(`http://localhost:8899`, 'confirmed');
    const payer = createKeypairFromFile(require('os').homedir() + '/.config/solana/id.json');
    const program = createKeypairFromFile('./target/deploy/solana_forward-keypair.json');
    const forwardId = 123456;

    let destination;
    let quarantine;
    let forwardPda;
    let forwardBump;

    beforeEach("setup", async () => {
        destination = Keypair.generate();
        quarantine = Keypair.generate();
        [forwardPda, forwardBump] = derivePageVisitsPda(destination.publicKey, forwardId, program.publicKey);
        await createForward(forwardPda, destination, quarantine, payer, program, forwardId, forwardBump, connection);
    });

    it("Should initialise forward!", async () => {
        const forwardInfo = await connection.getAccountInfo(forwardPda);
        const fwd= Forward.fromBuffer(forwardInfo.data);

        expect(fwd.id).to.equal(forwardId);
        expect(fwd.bump).to.equal(forwardBump);
        expect(new PublicKey(fwd.destination)).to.deep.equal(destination.publicKey);
        expect(new PublicKey(fwd.quarantine)).to.deep.equal(quarantine.publicKey);
    });

    it("Should deposit to forward", async () => {
        let balanceBefore = await connection.getBalance(forwardPda);
        let depositAmount = LAMPORTS_PER_SOL/100;
        await deposit(connection, payer, forwardPda, depositAmount);
        let balanceAfter = await connection.getBalance(forwardPda);
        expect(balanceAfter - balanceBefore).to.equal(depositAmount);
    });

});
