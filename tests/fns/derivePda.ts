import {PublicKey} from "@solana/web3.js";
import {Buffer} from "buffer";
import {toLeArray} from "./toLeArray";

export function derivePageVisitsPda(destPubkey: PublicKey, id: Number, programId) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("forward"), destPubkey.toBuffer(), Buffer.from(toLeArray(id))],
        programId,
    )
}