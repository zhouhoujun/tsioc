import { Serializer, TransportError } from '@tsdi/core';
import { Injectable, isDefined } from '@tsdi/ioc';

@Injectable()
export class JsonSerializer implements Serializer {
    serialize<T>(input: T): string | Uint8Array {
        try {
            return isDefined(input) ? JSON.stringify(input) : '';
        } catch (err) {
            throw new TransportError((err as Error).message);
        }
    }
}
