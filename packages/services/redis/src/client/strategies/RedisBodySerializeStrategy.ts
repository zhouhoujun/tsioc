import { Injectable } from '@tsdi/ioc';
import { IBodySerializeStrategy, BODY_SERIALIZE_STRATEGY } from '@tsdi/common/client/strategies';
import { RequestContext } from '@tsdi/common';
import { Buffer } from 'buffer';

/**
 * Redis body serialize strategy.
 * Serializes request bodies for Redis pub/sub payloads.
 */
@Injectable()
export class RedisBodySerializeStrategy implements IBodySerializeStrategy {
    serialize(body: any, context: RequestContext): ArrayBuffer | Buffer | Blob | FormData | string | null {
        if (body == null) return null as any;
        if (Buffer.isBuffer(body)) return body;
        if (typeof body === 'string') return body;
        if (body instanceof ArrayBuffer) return new Uint8Array(body);
        // For objects/arrays, serialize to JSON string
        try {
            return JSON.stringify(body);
        } catch {
            return String(body);
        }
    }

    detectContentType(body: any): string | null {
        if (body == null) return null;
        if (Buffer.isBuffer(body)) return 'application/octet-stream';
        if (typeof body === 'string') return 'text/plain';
        if (typeof body === 'object') return 'application/json';
        return null;
    }

    canHandle(_body: any): boolean {
        // Redis can handle strings, buffers, and JSON-serializable objects
        return _body !== undefined;
    }
}

export const RedisBodySerializeStrategyToken = BODY_SERIALIZE_STRATEGY;
