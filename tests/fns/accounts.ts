import * as web3 from "@solana/web3.js";

export async function deposit(
    connection,
    from,
    to,
    depositAmount) {

    const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
            fromPubkey: from.publicKey,
            toPubkey: to,
            lamports: depositAmount
        }));

    return  await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [from]
    );
}

export async function initialiseAccountWithMinimumBalance(
    connection,
    payer,
    to
)
{
    const minumumBalance = await connection.getMinimumBalanceForRentExemption(0);
    await deposit(connection, payer, to, minumumBalance);
}

