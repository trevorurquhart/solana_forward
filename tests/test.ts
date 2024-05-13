import {
    Connection,
    Keypair, PublicKey,
    sendAndConfirmTransaction, SystemProgram,
    Transaction,
    TransactionInstruction,
} from '@solana/web3.js';
import * as borsh from "borsh";
import { Buffer } from "buffer";
import {deposit} from "./fns/deposit";
import {derivePageVisitsPda} from "./fns/derivePda";
import {createKeypairFromFile} from "./fns/createKeyPair";
import {CreateForwardInstruction, Forward, ForwardsInstructions} from "./classes/classes";

describe("forward tests", () => {

    // Loading these from local files for development
    const connection = new Connection(`http://localhost:8899`, 'confirmed');
    const payer = createKeypairFromFile(require('os').homedir() + '/.config/solana/id.json');
    const program = createKeypairFromFile('./target/deploy/solana_forward-keypair.json');

    const destination = Keypair.generate();
    const quarantine = Keypair.generate();

    const forwardId = 123456;
    const [forwardPda, forwardBump] = derivePageVisitsPda(destination.publicKey, forwardId, program.publicKey);

    it("Initialise forward!", async () => {

        console.log(`programId: ${program.publicKey}, forwardPda : ${forwardPda}, bump: ${forwardBump}`)

        let ix = new TransactionInstruction({
            keys: [
                {pubkey: forwardPda, isSigner: false, isWritable: true},
                {pubkey: destination.publicKey, isSigner: false, isWritable: false},
                {pubkey: quarantine.publicKey, isSigner: false, isWritable: false},
                {pubkey: payer.publicKey, isSigner: true, isWritable: true},
                {pubkey: SystemProgram.programId, isSigner: false, isWritable: false}
            ],
            programId: program.publicKey,
            data: (
                new CreateForwardInstruction({
                    instruction: ForwardsInstructions.CreateForward,
                    id: forwardId,
                    bump: forwardBump
                })
            ).toBuffer(),
        });
        try {
            await sendAndConfirmTransaction(
                connection,
                new Transaction().add(ix),
                [payer]
            );
        } catch (e)
        {
            console.log(e)
        }

    });

    it("Read forward data", async () => {
        const forwardInfo = await connection.getAccountInfo(forwardPda);
        const fwd= Forward.fromBuffer(forwardInfo.data);
        console.log(`id          : ${fwd.id}`);
        console.log(`destination : ${fwd.destination}`);
        console.log(`quarantine  : ${fwd.quarantine}`);
        console.log(`bump        : ${fwd.bump}`);
    });


    it("Should deposit to forward", async () => {
        await deposit(connection, payer, forwardPda, 10000);
        let balance = await connection.getBalance(forwardPda);
        console.log(`Forward balance: ${balance}`);
    });

});
