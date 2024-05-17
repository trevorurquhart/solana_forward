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
    CreateForwardInstruction, ExecuteForwardInstruction,
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

export async function execute(payer, program, connection, forwardPda, destination, forwardAta?, destinationAta?) {

    let tokenAccounts = [];
    if (typeof forwardAta !== 'undefined') {
        tokenAccounts =
            [
                {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
                {pubkey: forwardAta, isSigner: false, isWritable: true},
                {pubkey: destinationAta, isSigner: false, isWritable: true}
            ];
    }
    let ix = new TransactionInstruction({
        keys: [
            {pubkey: forwardPda, isSigner: false, isWritable: true},
            {pubkey: destination.publicKey, isSigner: false, isWritable: true},
            ...tokenAccounts,
        ],
        programId: program.publicKey,
        data: (
            new ExecuteForwardInstruction({
                instruction: ForwardInstructions.Execute,
            })
        ).toBuffer(),
    });
    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [payer]
    );

}