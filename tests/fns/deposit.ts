import * as web3 from "@solana/web3.js";

export async function deposit(
    connection,
    from,
    to,
    depositAmount) {

    const instructions = new web3.Transaction().add(
        web3.SystemProgram.transfer({
            fromPubkey: from,
            toPubkey: to,
            lamports: depositAmount
        }));
    return  await web3.sendAndConfirmTransaction(
        connection,
        instructions,
        [from]
    );
}
