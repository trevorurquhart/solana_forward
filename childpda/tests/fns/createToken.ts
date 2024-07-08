import {
    Commitment,
    ConfirmOptions,
    Connection,
    PublicKey,
    sendAndConfirmTransaction,
    Signer,
    Transaction
} from "@solana/web3.js";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountIdempotentInstruction, createMint,
    getAssociatedTokenAddressSync, mintTo, TOKEN_PROGRAM_ID
} from "@solana/spl-token";

export async function createATA(
    mint: PublicKey,
    owner: PublicKey,
    allowOwnerOffCurve: boolean = false,
    payer: Signer,
    connection: Connection,
    confirmOptions?: ConfirmOptions,
    programId = TOKEN_PROGRAM_ID,
    associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
): Promise<PublicKey> {

    const associatedToken = getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve, programId, associatedTokenProgramId);
    const transaction = new Transaction().add(
        createAssociatedTokenAccountIdempotentInstruction(
            payer.publicKey,
            associatedToken,
            owner,
            mint,
            programId,
            associatedTokenProgramId
        )
    );
    await sendAndConfirmTransaction(connection, transaction, [payer], confirmOptions);
    return associatedToken;
}

export async function createAndFundAta(mint, to, mintAmount, payer, mintAuthority, connection, programId = TOKEN_PROGRAM_ID)
{
    const ata = await createATA(mint, to, true, payer, connection, undefined, programId);
    await mintTo(connection, payer, mint, ata, mintAuthority, mintAmount, [], undefined, programId);
    return ata;
}
