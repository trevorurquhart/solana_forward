import {
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {Buffer} from "buffer";
import {toLeArray} from "./toLeArray";
import {CreateForwardInstruction, ExecuteForwardInstruction, ForwardsInstructions} from "../classes/classes";

export function deriveForwardPda(destPubkey: PublicKey, id: Number, programId) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("forward"), destPubkey.toBuffer(), Buffer.from(toLeArray(id))],
        programId,
    )
}

export async function createForward(forwardPda, destination, quarantine, payer, program, forwardId, forwardBump, connection) {

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
    } catch (e) {
        console.log(e)
    }
}

export async function execute(forwardPda, destination, payer, program, connection) {

    let ix = new TransactionInstruction({
        keys: [
            {pubkey: forwardPda, isSigner: false, isWritable: true},
            {pubkey: destination.publicKey, isSigner: false, isWritable: true},
            {pubkey: payer.publicKey, isSigner: true, isWritable: true},
            // {pubkey: SystemProgram.programId, isSigner: false, isWritable: false}
        ],
        programId: program.publicKey,
        data: (
            new ExecuteForwardInstruction({
                instruction: ForwardsInstructions.Execute,
            })
        ).toBuffer(),
    });
    try {
        await sendAndConfirmTransaction(
            connection,
            new Transaction().add(ix),
            [payer]
        );
    } catch (e) {
        console.log(e)
    }
}