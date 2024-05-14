import {Connection, Keypair, LAMPORTS_PER_SOL, PublicKey,} from '@solana/web3.js';
import {deposit} from "./fns/deposit";
import {createForward, deriveForwardPda, execute} from "./fns/forwardFns";
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
        [forwardPda, forwardBump] = deriveForwardPda(destination.publicKey, forwardId, program.publicKey);
        await createForward(forwardPda, destination, quarantine, payer, program, forwardId, forwardBump, connection);
    });

    it("Should initialise forward", async () => {
        const forwardInfo = await connection.getAccountInfo(forwardPda);
        const fwd= Forward.fromBuffer(forwardInfo.data);

        expect(fwd.id).to.equal(forwardId);
        expect(fwd.bump).to.equal(forwardBump);
        expect(new PublicKey(fwd.destination)).to.deep.equal(destination.publicKey);
        expect(new PublicKey(fwd.quarantine)).to.deep.equal(quarantine.publicKey);
    });

    it("Should deposit to forward", async () => {
        let depositAmount = LAMPORTS_PER_SOL/100;
        let balanceBefore = await connection.getBalance(forwardPda);
        await deposit(connection, payer, forwardPda, depositAmount);
        let balanceAfter = await connection.getBalance(forwardPda);
        expect(balanceAfter - balanceBefore).to.equal(depositAmount);
    });

    it("Should transfer sol when executed", async () => {
        let destinationBalanceBefore = await connection.getBalance(destination.publicKey);
        let forwardAmount = LAMPORTS_PER_SOL/100;
        await deposit(connection, payer, forwardPda, forwardAmount);
        await execute(forwardPda, destination, payer, program, connection)
        let destinationBalanceAfter = await connection.getBalance(destination.publicKey);
        expect(destinationBalanceAfter - destinationBalanceBefore).to.equal(forwardAmount);
    });

});
