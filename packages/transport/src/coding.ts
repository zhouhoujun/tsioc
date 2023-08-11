import { Abstract, tokenId } from '@tsdi/ioc';
import { Packet } from '@tsdi/common';
import { Logger } from '@tsdi/logger';
import { SendPacket } from './TransportSession';


@Abstract()
export abstract class Encoder {
    abstract encode(input: SendPacket): Buffer;
    abstract write(input: SendPacket, maxSize?: number, chunk?: Buffer, callback?: (err?: any) => void): void;
}

@Abstract()
export abstract class Decoder {
    abstract decode(input: Buffer): Packet;
}


export interface CodingContext<TInput, TOutput> {
    [x: string]: any;
    input: TInput;
    output?: TOutput;
    maxSize?: number;
    chunk?: Buffer;
    logger?: Logger;
}

export const NEXT_VOID = () => { };

export interface Encoding<TInput = SendPacket, TOutput = Buffer> {
    handle(ctx: CodingContext<TInput, TOutput>, next: () => void): void;
}


export interface Decoding<TInput = Buffer | string, TOutput = Packet> {
    handle(ctx: CodingContext<TInput, TOutput>, next: () => void): void;
}


export const ENCODINGS = tokenId<Encoding[]>('ENCODINGS');

export const DECODINGS = tokenId<Decoding[]>('DECODINGS');