import { Injectable } from '@tsdi/ioc';
import { IBodySerializeStrategy } from '@tsdi/transport';

/**
 * UDP body serializer.
 * Serializes outbound payloads to Buffer or string and deserializes inbound payloads.
 */
@Injectable()
export class UdpBodySerializeStrategy implements IBodySerializeStrategy {
    serialize(data: any): Buffer | string {
        if (data instanceof Buffer) {
            return data;
        }
        if (typeof data === 'string') {
            return data;
        }
        try {
            return Buffer.from(JSON.stringify(data));
        } catch {
            return String(data);
        }
    }

    deserialize(data: Buffer | string): any {
        const str = data instanceof Buffer ? data.toString() : String(data);
        try {
            return JSON.parse(str);
        } catch {
            return str;
        }
    }
}
