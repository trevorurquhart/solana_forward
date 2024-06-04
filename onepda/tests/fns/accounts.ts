import * as web3 from "@solana/web3.js";

export async function deposit(
    from,
    to,
    depositAmount,
    connection) {

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
    account,
    payer,
    connection
)
{
    const minumumBalance = await connection.getMinimumBalanceForRentExemption(0);
    await deposit(payer, account, minumumBalance, connection);
}

