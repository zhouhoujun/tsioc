import { Injectable } from '@tsdi/ioc';
import { IBodySerializeStrategy, BODY_SERIALIZE_STRATEGY } from '@tsdi/common/client';
import { RequestContext, IStream } from '@tsdi/common';
import { CoapRequest } from '../request';

/**
 * CoAP Body Serialize Strategy
 * Serializes request bodies for CoAP payloads. CoAP commonly uses Buffer payloads.
 */
@Injectable()
export class CoapBodySerializeStrategy implements IBodySerializeStrategy {
    serialize(body: any, context: RequestContext): ArrayBuffer | IStream | Buffer | Blob | FormData | string | null {
        if (body == null) return null;
        if (Buffer.isBuffer(body)) return body;
        if (typeof body === 'string') return body;
        try {
            return JSON.stringify(body);
        } catch {
            return String(body);
        }
    }

    detectContentType(body: any): string | null {
        if (body == null) return null;
        // Simple heuristic: JSON bodies default to application/json; strings to text/plain
        if (typeof body === 'object') return 'application/json';
        if (typeof body === 'string') return 'text/plain';
        return null;
    }

    canHandle(_body: any): boolean {
        // In this simplified implementation, we assume any body can be serialized
        return true;
    }
}
