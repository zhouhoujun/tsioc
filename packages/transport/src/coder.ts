import { Decoder, Encoder, TransportError } from '@tsdi/core';
import { Injectable, isDefined, isString } from '@tsdi/ioc';


@Injectable()
export class JsonDecoder implements Decoder {
    decode<T>(input: string | Uint8Array | Buffer): T {
        const source = isString(input) ? input : new TextDecoder().decode(input);
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
            return isDefined(input) ? JSON.stringify(input) : '';
        } catch (err) {
            throw new TransportError((err as Error).message);
        }
    }
}
