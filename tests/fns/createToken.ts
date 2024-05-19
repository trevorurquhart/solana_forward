import {ConfirmOptions, Connection, PublicKey, sendAndConfirmTransaction, Signer, Transaction} from "@solana/web3.js";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountIdempotentInstruction, createMint,
    getAssociatedTokenAddressSync, mintTo, TOKEN_PROGRAM_ID
} from "@solana/spl-token";

export async function createATA(
    connection: Connection,
    payer: Signer,
    mint: PublicKey,
    owner: PublicKey,
    allowOwnerOffCurve: boolean = false,
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

export async function createAndFundAta(connection, payer, mint, mintAuthority, mintAmount, to)
{
    // Create associated token accounts for the new accounts
    const ata = await createATA(connection, payer, mint, to, true);
    await mintTo(connection, payer, mint, ata, mintAuthority, mintAmount);
    return ata;
}
