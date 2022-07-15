import { Decoder, Encoder, isArrayBuffer, Packet, TransportError } from '@tsdi/core';
import { Injectable, isDefined, isString } from '@tsdi/ioc';
import { isBuffer } from './utils';


@Injectable()
export class JsonDecoder implements Decoder<string | Uint8Array | Buffer> {
    decode(input: string | Uint8Array | Buffer, encoding?: BufferEncoding): Packet {
        let source: Buffer;
        if (isString(input)) {
            source = Buffer.from(input);
        } else if (isBuffer(input)) {
            source = input;
        } else if (isArrayBuffer(input)) {
            source = Buffer.from(new TextDecoder().decode(input));
        } else {
            source = Buffer.from(String(input));
        }

        try {
            const type = source.slice(0, 1).toString(encoding);
            if (type === '1') {
                source = source.slice(1);
                return {
                    id: source.slice(0, 36).toString(encoding),
                    body: source.slice(37)
                }
            } else if (type === '0') {
                source = source.slice(1);
            }

            return (source.length ? JSON.parse(source.toString(encoding)) : null);
        } catch (err) {
            throw new TransportError((err as Error).message);
        }
    }
}

@Injectable()
export class JsonEncoder implements Encoder<Buffer> {
    encode(input: any): Buffer {
        if (isBuffer(input)) {
            return input;
        }
        if (isString(input)) {
            return Buffer.from(input);
        }

        try {
            return Buffer.from(isDefined(input) ? JSON.stringify(input) : '');
        } catch (err) {
            throw new TransportError((err as Error).message);
        }
    }
}
