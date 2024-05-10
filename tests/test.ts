import {
    Connection,
    Keypair,
    sendAndConfirmTransaction, SystemProgram,
    Transaction,
    TransactionInstruction,
} from '@solana/web3.js';
import * as borsh from "borsh";
import { Buffer } from "buffer";


function createKeypairFromFile(path: string): Keypair {
    return Keypair.fromSecretKey(
        Buffer.from(JSON.parse(require('fs').readFileSync(path, "utf-8")))
    )
}

describe("hello-solana", () => {

    // Loading these from local files for development
    const connection = new Connection(`http://localhost:8899`, 'confirmed');
    const payer = createKeypairFromFile(require('os').homedir() + '/.config/solana/id.json');
    const program = createKeypairFromFile('./target/deploy/solana_forward-keypair.json');



    class Assignable {
        constructor(properties) {
            Object.keys(properties).map((key) => {
                return (this[key] = properties[key]);
            });
        };
    }

    class Forward extends Assignable {
        toBuffer() { return Buffer.from(borsh.serialize(ForwardSchema, this)) }

        static fromBuffer(buffer: Buffer) {
            return borsh.deserialize(ForwardSchema, Forward, buffer);
        };
    }

    const ForwardSchema = new Map([
        [ Forward, {
            kind: 'struct',
            fields: [
                ['id', 'u32'],
                ['destination', [32]],
                ['quarantine', [32]],
                ['bump', 'u8']
            ],
        }]
    ]);

    class CreateForwardInstruction extends Assignable {
        toBuffer() { return Buffer.from(borsh.serialize(CreateForwardInstructionSchema, this)) }

        static fromBuffer(buffer: Buffer) {
            return borsh.deserialize(CreateForwardInstructionSchema, Forward, buffer);
        };
    }

    const CreateForwardInstructionSchema = new Map([
        [ CreateForwardInstruction, {
            kind: 'struct',
            fields: [
                ['id', 'u32'],
            ],
        }]
    ]);

    const destination = Keypair.generate();
    const quarantine = Keypair.generate();
    const forward = Keypair.generate();

    it("Initialise forward!", async () => {

        let ix = new TransactionInstruction({
            keys: [
                {pubkey: forward.publicKey, isSigner: true, isWritable: true},
                {pubkey: destination.publicKey, isSigner: false, isWritable: true},
                {pubkey: quarantine.publicKey, isSigner: false, isWritable: true},
                {pubkey: payer.publicKey, isSigner: true, isWritable: true},
                {pubkey: SystemProgram.programId, isSigner: false, isWritable: false}
            ],
            programId: program.publicKey,
            data: (
                new CreateForwardInstruction({
                    id: 123456,
                })
            ).toBuffer(),
        });
        try {
            await sendAndConfirmTransaction(
                connection,
                new Transaction().add(ix),
                [payer, forward]
            );
        } catch (e)
        {
            console.log(e)
        }

    });

    it("Read forward data", async () => {
        const forwardInfo = await connection.getAccountInfo(forward.publicKey);
        const fwd= Forward.fromBuffer(forwardInfo.data);
        console.log(`id          : ${fwd.id}`);
        console.log(`destination : ${fwd.destination}`);
        console.log(`quarantine  : ${fwd.quarantine}`);
        console.log(`bump        : ${fwd.bump}`);
    });

});
