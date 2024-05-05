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
            ],
        }]
    ]);

    const forward = Keypair.generate();

    it("Initialise forward!", async () => {

        let ix = new TransactionInstruction({
            keys: [
                {pubkey: forward.publicKey, isSigner: true, isWritable: true},
                {pubkey: payer.publicKey, isSigner: true, isWritable: true},
                {pubkey: SystemProgram.programId, isSigner: false, isWritable: false}
            ],
            programId: program.publicKey,
            data: (
                new Forward({
                    id: 123456,
                })
            ).toBuffer(),
        });
        await sendAndConfirmTransaction(
            connection,
            new Transaction().add(ix),
            [payer, forward]
        );
    });

    it("Read forward data", async () => {
        const forwardInfo = await connection.getAccountInfo(forward.publicKey);
        const readAddressInfo = Forward.fromBuffer(forwardInfo.data);
        console.log(`Id     : ${readAddressInfo.id}`);
    });
});
