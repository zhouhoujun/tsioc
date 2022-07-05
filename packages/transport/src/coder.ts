import { Decoder, Encoder, Packet, TransportError } from '@tsdi/core';
import { Injectable, isDefined, isString } from '@tsdi/ioc';


@Injectable()
export class JsonDecoder implements Decoder<string | Uint8Array | Buffer> {
    decode(input: string | Uint8Array | Buffer): Packet {
        const source = Buffer.from(isString(input) ? input : new TextDecoder().decode(input), 'base64').toString('utf8');
        try {
            return (source !== '' ? JSON.parse(source) : null);
        } catch (err) {
            throw new TransportError((err as Error).message);
        }
    }
}

@Injectable()
export class JsonEncoder implements Encoder {
    encode<T>(input: T): string  {
        try {
            return Buffer.from(isDefined(input) ? JSON.stringify(input) : '').toString('base64');
        } catch (err) {
            throw new TransportError((err as Error).message);
        }
    }
}
