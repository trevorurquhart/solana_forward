import {Buffer} from "buffer";
import * as borsh from "borsh";

export enum ForwardsInstructions {
    CreateForward,
    Execute,
}
class Assignable {
    constructor(properties) {
        Object.keys(properties).map((key) => {
            return (this[key] = properties[key]);
        });
    };
}

export class Forward extends Assignable {
    toBuffer() { return Buffer.from(borsh.serialize(ForwardSchema, this)) }

    static fromBuffer(buffer: Buffer) {
        return borsh.deserialize(ForwardSchema, Forward, buffer);
    };
}

const ForwardSchema = new Map([
    [ Forward, {
        kind: 'struct',
        fields: [
            ['id', 'u32'],
            ['destination', [32]],
            ['quarantine', [32]],
            ['bump', 'u8']
        ],
    }]
]);

export class CreateForwardInstruction extends Assignable {
    toBuffer() { return Buffer.from(borsh.serialize(CreateForwardInstructionSchema, this)) }

    static fromBuffer(buffer: Buffer) {
        return borsh.deserialize(CreateForwardInstructionSchema, CreateForwardInstruction, buffer);
    };
}

const CreateForwardInstructionSchema = new Map([
    [ CreateForwardInstruction, {
        kind: 'struct',
        fields: [
            ['instruction', 'u8'],
            ['id', 'u32'],
            ['bump', 'u8'],
        ],
    }]
]);

export class ExecuteForwardInstruction extends Assignable {
    toBuffer() { return Buffer.from(borsh.serialize(ExecuteForwardInstructionSchema, this)) }

    static fromBuffer(buffer: Buffer) {
        return borsh.deserialize(ExecuteForwardInstructionSchema, CreateForwardInstruction, buffer);
    };
}

const ExecuteForwardInstructionSchema = new Map([
    [ ExecuteForwardInstruction, {
        kind: 'struct',
        fields: [
            ['instruction', 'u8'],
        ],
    }]
]);

