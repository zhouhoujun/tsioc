import { Injectable } from '@tsdi/ioc';
import { IBodySerializeStrategy } from '@tsdi/common/client';
import { RequestContext } from '@tsdi/common';

@Injectable()
export class HttpBodySerializeStrategy implements IBodySerializeStrategy {
    serialize(body: any, _context: RequestContext): string | null {
        if (body == null) return null;
        if (typeof body === 'string' || body instanceof String) {
            return String(body);
        }
        if (Buffer.isBuffer(body)) {
            return body.toString();
        }
        if (typeof body === 'object') {
            return JSON.stringify(body);
        }
        return String(body);
    }

    detectContentType(body: any): string | null {
        if (body == null) return null;
        if (typeof body === 'string') return 'text/plain';
        if (typeof body === 'object') return 'application/json';
        return null;
    }

    canHandle(_body: any): boolean {
        return true;
    }
}
