import {
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {Buffer} from "buffer";
import {toLeArray} from "./toLeArray";
import {CreateForwardInstruction, ExecuteForwardInstruction, ForwardInstructions} from "../classes/classes";

export function deriveForwardPda(destPubkey: PublicKey, id: Number, programId) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("forward"), destPubkey.toBuffer(), Buffer.from(toLeArray(id))],
        programId,
    )
}

export async function createForward(forwardPda,
                                    desintationPublicKey: PublicKey,
                                    quarantine,
                                    payer,
                                    program,
                                    forwardId,
                                    forwardBump,
                                    connection,
                                    systemProgram: any | PublicKey = SystemProgram.programId) {

    let ix = new TransactionInstruction({
        keys: [
            {pubkey: forwardPda, isSigner: false, isWritable: true},
            {pubkey: desintationPublicKey, isSigner: false, isWritable: false},
            {pubkey: quarantine.publicKey, isSigner: false, isWritable: false},
            {pubkey: payer.publicKey, isSigner: true, isWritable: true},
            {pubkey: systemProgram, isSigner: false, isWritable: false}
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

//tokenAccounts = TOKEN_PROGRAM_ID, forwardAta1, destinationAta1, forwardAta2, destinationAta2.....
export async function execute(payer, program, connection, forwardPda, destination, ...tokenAccounts: PublicKey[]) {

    let tokenTransactionAccounts = tokenAccounts.map(key  => ({pubkey: key, isSigner: false, isWritable: true}));
    let keys = [
        {pubkey: forwardPda, isSigner: false, isWritable: true},
        {pubkey: destination.publicKey, isSigner: false, isWritable: true},
        ...tokenTransactionAccounts,
    ];

    let ix = new TransactionInstruction({
        keys: keys,
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

export async function quarantine(payer, program, connection, forwardPda, quarantine, authority, ...tokenAccounts: PublicKey[]) {

    let tokenTransactionAccounts = tokenAccounts.map(key  => ({pubkey: key, isSigner: false, isWritable: true}));
    let keys = [
        {pubkey: forwardPda, isSigner: false, isWritable: true},
        {pubkey: quarantine.publicKey, isSigner: false, isWritable: true},
        {pubkey: authority.publicKey, isSigner: true, isWritable: true},
        ...tokenTransactionAccounts,
    ];

    let ix = new TransactionInstruction({
        keys: keys,
        programId: program.publicKey,
        data: (
            new ExecuteForwardInstruction({
                instruction: ForwardInstructions.Quarantine,
            })
        ).toBuffer(),
    });
    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [payer, authority]
    );

}