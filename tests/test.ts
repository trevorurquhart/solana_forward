import {Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SendTransactionError,} from '@solana/web3.js';
import {deposit} from "./fns/deposit";
import {createForward, deriveForwardPda, executeSol, executeToken} from "./fns/forwardFns";
import {createKeypairFromFile} from "./fns/createKeyPair";
import {Forward} from "./classes/classes";
import {beforeEach} from "mocha";
import {expect} from "chai";
import {createMint} from "@solana/spl-token";
import {createAndFundAta} from "./fns/createToken";

describe("forward tests", () => {

    const connection = new Connection(`http://localhost:8899`, 'confirmed');
    const payer = createKeypairFromFile(require('os').homedir() + '/.config/solana/id.json');
    const program = createKeypairFromFile('./target/deploy/solana_forward-keypair.json');
    const mintAuthority = Keypair.generate();
    const forwardId = 123456;

    let destination, quarantine, mint, forwardPda, forwardBump;

    beforeEach("setup", async () => {
        destination = Keypair.generate();
        quarantine = Keypair.generate();
        mint = await createMint(connection, payer, mintAuthority.publicKey, null, 0);
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
        // let destinationBalanceBefore = await connection.getBalance(destination.publicKey);
        let forwardAmount = LAMPORTS_PER_SOL/100;
        await deposit(connection, payer, forwardPda, forwardAmount);
        await executeSol(forwardPda, destination, payer, program, connection)
        let destinationBalanceAfter = await connection.getBalance(destination.publicKey);
        expect(destinationBalanceAfter).to.equal(forwardAmount);
    });

    it("Should not transfer sol to an invalid destination", async () =>{
        let forwardAmount = LAMPORTS_PER_SOL/100;
        await deposit(connection, payer, forwardPda, forwardAmount);
        let invalidDestination = Keypair.generate();
        try {
            await executeSol(forwardPda, invalidDestination, payer, program, connection)
        } catch (e) {
            expect(e).to.be.an.instanceof(SendTransactionError)
        }

    });

    it("Should deposit tokens to forward", async () =>{
        let tokenAmount = 1000;
        let forwardAta = await createAndFundAta(connection, payer, mint, mintAuthority, tokenAmount, forwardPda);
        const info = await connection.getTokenAccountBalance(forwardAta);
        expect(info.value.uiAmount).to.equal(tokenAmount);
    });

    it("Should transfer tokens when executed", async () =>{
        let forwardAmount = 1000;
        let destinationInitialBalance = 5000;
        let destinationAta = await createAndFundAta(connection, payer, mint, mintAuthority, destinationInitialBalance, destination.publicKey);
        let forwardAta = await createAndFundAta(connection, payer, mint, mintAuthority, forwardAmount, forwardPda);
        await executeToken(forwardPda, forwardAta, destinationAta, payer, program, connection);
        const info = await connection.getTokenAccountBalance(destinationAta);
        expect(info.value.uiAmount).to.equal(forwardAmount + destinationInitialBalance);
    });
});
