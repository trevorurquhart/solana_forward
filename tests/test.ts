import {
    Connection,
    Keypair, PublicKey,
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

describe("forward tests", () => {

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
            return borsh.deserialize(CreateForwardInstructionSchema, CreateForwardInstruction, buffer);
        };
    }

    const CreateForwardInstructionSchema = new Map([
        [ CreateForwardInstruction, {
            kind: 'struct',
            fields: [
                ['id', 'u32'],
                ['bump', 'u8'],
            ],
        }]
    ]);

    const destination = Keypair.generate();
    const quarantine = Keypair.generate();

    function derivePageVisitsPda(destPubkey: PublicKey, id: String) {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("forward"), destPubkey.toBuffer(), Buffer.from(id)],
            program.publicKey,
        )
    }

    it("Initialise forward!", async () => {

        const forwardId = "123456";
        const [forwardPda, forwardBump] = derivePageVisitsPda(destination.publicKey, forwardId);

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
        const forwardInfo = await connection.getAccountInfo(forward.publicKey);
        const fwd= Forward.fromBuffer(forwardInfo.data);
        console.log(`id          : ${fwd.id}`);
        console.log(`destination : ${fwd.destination}`);
        console.log(`quarantine  : ${fwd.quarantine}`);
        console.log(`bump        : ${fwd.bump}`);
    });

});
