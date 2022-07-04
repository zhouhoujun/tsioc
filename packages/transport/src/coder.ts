import { Decoder, Encoder, TransportError } from '@tsdi/core';
import { Injectable, isDefined, isString } from '@tsdi/ioc';


@Injectable()
export class JsonDecoder implements Decoder {
    decode<T>(input: string | Uint8Array | Buffer): T {
        const source = Buffer.from(isString(input) ? input : new TextDecoder().decode(input), 'base64').toString('utf8');
        try {
            return (source !== '' ? JSON.parse(source) : null) as T
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
