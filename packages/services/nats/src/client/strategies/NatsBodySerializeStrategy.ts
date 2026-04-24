import { Injectable } from '@tsdi/ioc';
import { IBodySerializeStrategy, BODY_SERIALIZE_STRATEGY } from '@tsdi/common/client';
import { RequestContext } from '@tsdi/common';

/**
 * NATS body serialize strategy.
 * Serializes request payloads for NATS protocol.
 */
@Injectable()
export class NatsBodySerializeStrategy implements IBodySerializeStrategy {

    serialize(body: any, context: RequestContext): ArrayBuffer | Buffer | Blob | FormData | string | any {
        if (body == null) return null as any;
        // If it's already a string, pass through
        if (typeof body === 'string') return body as any;
        // If it's a Buffer (Node), pass through
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(body)) {
            return body as any;
        }
        // Fallback to JSON serialization for objects/arrays
        try {
            return JSON.stringify(body) as any;
        } catch {
            return String(body) as any;
        }
    }

    detectContentType(body: any): string | null {
        if (body == null) return null;
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(body)) {
            return 'application/octet-stream';
        }
        if (typeof body === 'string') {
            return 'text/plain';
        }
        // Default to JSON for objects/arrays
        return 'application/json';
    }

    canHandle(_body: any): boolean {
        // NATS client can serialize string, Buffer, or JSON-able objects
        return true;
    }
}

export const NatsBodySerializeStrategyToken = BODY_SERIALIZE_STRATEGY;
