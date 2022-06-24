import { TransportError } from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';


@Injectable()
export class JsonDeserializer {
    deserialize<T>(input: string | Uint8Array | Buffer): T {
        const source = isString(input) ? input : new TextDecoder().decode(input);
        try {
            return (source !== '' ? JSON.parse(source) : null) as T
        } catch (err) {
            throw new TransportError((err as Error).message);
        }
    }
}
