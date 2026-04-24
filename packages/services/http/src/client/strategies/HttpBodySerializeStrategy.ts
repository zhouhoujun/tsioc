import { Injectable } from '@tsdi/ioc';
import { IBodySerializeStrategy } from '@tsdi/common/client';
import { RequestContext } from '@tsdi/common';

/**
 * HTTP body serialize strategy.
 * HTTP 请求体序列化策略的最小实现，用于测试和示例。
 */
@Injectable()
export class HttpBodySerializeStrategy implements IBodySerializeStrategy {
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
        // This is a generic fallback that can handle most payloads
        return true;
    }
}
