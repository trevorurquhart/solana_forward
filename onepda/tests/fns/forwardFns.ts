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
import {ASSOCIATED_TOKEN_PROGRAM_ID} from "@solana/spl-token";

export function deriveForwardPda(destPubkey: PublicKey, id: Number, programId) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("forward"), destPubkey.toBuffer(), Buffer.from(toLeArray(id))],
        programId,
    )
}

export async function createForward(
    forwardId,
    desintationPublicKey: PublicKey,
    forwardBump,
    forwardPda,
    program,
    payer,
    connection,
    systemProgram: any = SystemProgram.programId) {

    let ix = new TransactionInstruction({
        keys: [
            {pubkey: forwardPda, isSigner: false, isWritable: true},
            {pubkey: desintationPublicKey, isSigner: false, isWritable: false},
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

export async function execute(forwardPda, destination, program, payer, connection) {

    let ix = new TransactionInstruction({
        keys: [
            {pubkey: forwardPda, isSigner: false, isWritable: true},
            {pubkey: destination.publicKey, isSigner: false, isWritable: true},
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

//tokenAccounts = mint1, forwardAta1, destinationAta1, mint2, forwardAta2, destinationAta2.....
export async function executeWithTokens(forwardPda, destination, program, payer, connection, token_program, ...tokenAccounts: PublicKey[]) {

    let tokenTransactionAccounts = tokenAccounts.map(key  => ({pubkey: key, isSigner: false, isWritable: true}));
    let keys = [
        {pubkey: forwardPda, isSigner: false, isWritable: true},
        {pubkey: destination.publicKey, isSigner: false, isWritable: true},
        {pubkey: payer.publicKey, isSigner: true, isWritable: true},
        {pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
        {pubkey: token_program, isSigner: false, isWritable: false},
        {pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
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

