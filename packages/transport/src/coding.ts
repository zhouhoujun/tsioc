import { Abstract, Injectable, isString, tokenId } from '@tsdi/ioc';
import { InvalidJsonException, NotSupportedExecption, Packet } from '@tsdi/common';
import { isBuffer } from './utils';
import { SendPacket } from './TransportSession';


@Abstract()
export abstract class Encoder {
    abstract encode(input: Packet): Buffer;
}

@Abstract()
export abstract class Decoder {
    abstract decode(input: Buffer): Packet;
}


export interface CodingContext<TInput, TOutput> {
    [x: string]: any;
    input: TInput;
    chunk?: Buffer;
    output: TOutput;
}

export interface Encoding<TInput = SendPacket, TOutput = Buffer> {
    handle(ctx: CodingContext<TInput, TOutput>, next: () => void): void;
}


export interface Decoding<TInput = Buffer, TOutput = Packet> {
    handle(ctx: CodingContext<TInput, TOutput>, next: () => void): void;
}


@Injectable()
export class JsonEncoder {

    handle(input: any): any {
        if (isBuffer(input) || isString(input)) throw new NotSupportedExecption();
        return JSON.stringify(input);
    }

}

@Injectable()
export class JsonDecoder {

    handle(input: any): any {
        if (isBuffer(input)) {
            input = new TextDecoder().decode(input);
        }
        try {
            return JSON.parse(input);
        } catch (err) {
            throw new InvalidJsonException(err, input);
        }
    }

}



export const ENCODINGS = tokenId<Encoding[]>('ENCODINGS');

export const DECODINGS = tokenId<Decoding[]>('DECODINGS');