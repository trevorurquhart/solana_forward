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
    forwardPda,
    desintationPublicKey: PublicKey,
    quarantinePublicKey: PublicKey,
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
            {pubkey: quarantinePublicKey, isSigner: false, isWritable: false},
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

export async function execute(payer, program, connection, forwardPda, destination) {

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
export async function executeWithTokens(payer, program, connection, forwardPda, destination, token_program, ...tokenAccounts: PublicKey[]) {

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

export async function quarantine(
    signer,
    program,
    connection,
    forwardPda,
    quarantine,
    authority,
    markAuthorityAsSigner: boolean = true) {

    let keys = [
        {pubkey: forwardPda, isSigner: false, isWritable: true},
        {pubkey: quarantine.publicKey, isSigner: false, isWritable: true},
        {pubkey: authority.publicKey, isSigner: markAuthorityAsSigner, isWritable: true},
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
        [signer]
    );
}

export async function quarantineWithTokens(
    signer,
    program,
    connection,
    forwardPda,
    quarantine,
    authority,
    tokenProgram,
    markAuthorityAsSigner: boolean = true,
    ...tokenAccounts: PublicKey[]) {

    let tokenTransactionAccounts = tokenAccounts.map(key => ({pubkey: key, isSigner: false, isWritable: true}));
    let keys = [
        {pubkey: forwardPda, isSigner: false, isWritable: true},
        {pubkey: quarantine.publicKey, isSigner: false, isWritable: true},
        {pubkey: authority.publicKey, isSigner: markAuthorityAsSigner, isWritable: true},
        {pubkey: signer.publicKey, isSigner: true, isWritable: true},
        {pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
        {pubkey: tokenProgram, isSigner: false, isWritable: false},
        {pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
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
        [signer]
    );
}
