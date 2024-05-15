import {
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {Buffer} from "buffer";
import {toLeArray} from "./toLeArray";
import {
    CreateForwardInstruction,
    ExecuteForwardInstruction,
    ExecuteForwardTokenInstruction,
    ForwardInstructions
} from "../classes/classes";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";

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
                instruction: ForwardInstructions.CreateForward,
                id: forwardId,
                bump: forwardBump
            })
        ).toBuffer(),
    });
    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [payer]
    );
}

export async function executeSol(forwardPda, destination, payer, program, connection) {

    let ix = new TransactionInstruction({
        keys: [
            {pubkey: forwardPda, isSigner: false, isWritable: true},
            {pubkey: destination.publicKey, isSigner: false, isWritable: true},
            {pubkey: payer.publicKey, isSigner: true, isWritable: true},
        ],
        programId: program.publicKey,
        data: (
            new ExecuteForwardInstruction({
                instruction: ForwardInstructions.ExecuteSol,
            })
        ).toBuffer(),
    });
    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [payer]
    );
}

export async function executeToken(forwardPda, forwardAta, destinationAta, payer, program, connection) {

    let ix = new TransactionInstruction({
        keys: [
            {pubkey: forwardPda, isSigner: false, isWritable: true},
            {pubkey: forwardAta, isSigner: false, isWritable: true},
            {pubkey: destinationAta, isSigner: false, isWritable: true},
            {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
        ],
        programId: program.publicKey,
        data: (
            new ExecuteForwardTokenInstruction({
                instruction: ForwardInstructions.ExecuteToken,
            })
        ).toBuffer(),
    });
    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [payer]
    );

}