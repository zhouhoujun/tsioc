import { Injectable } from '@tsdi/ioc';
import { IBodySerializeStrategy } from '@tsdi/common/client';
import { RequestContext } from '@tsdi/common';

/**
 * Tcp body serialize strategy.
 * TCP 请求体序列化策略的最小实现。
 *
 * English:
 * Minimal implementation of a TCP body serialization strategy used for tests and examples.
 */
@Injectable()
export class TcpBodySerializeStrategy implements IBodySerializeStrategy {
    serialize(body: any, context: RequestContext): ArrayBuffer | Buffer | Blob | FormData | string | null {
        if (body == null) return null as any;
        if (typeof body === 'string' || body instanceof String) {
            return String(body) as any;
        }
        if (Buffer.isBuffer(body)) {
            return body;
        }
        // Fallback to JSON for objects/arrays
        if (typeof body === 'object') {
            return JSON.stringify(body) as any;
        }
        return String(body) as any;
    }

    detectContentType(body: any): string | null {
        if (body == null) return null;
        if (typeof body === 'string') return 'text/plain';
        if (typeof body === 'object') return 'application/json';
        return null;
    }

    canHandle(body: any): boolean {
        // Generic fallback that can handle most payloads
        return true;
    }
}
