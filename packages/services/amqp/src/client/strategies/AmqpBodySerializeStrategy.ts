import { Injectable } from '@tsdi/ioc';
import { IBodySerializeStrategy } from '@tsdi/common/client';
import { RequestContext } from '@tsdi/common';

@Injectable()
export class AmqpBodySerializeStrategy implements IBodySerializeStrategy {
    serialize(body: any, context: RequestContext): any {
        if (body === null) return null;
        if (Buffer.isBuffer(body)) return body;
        if (typeof body === 'string') return Buffer.from(body);
        return Buffer.from(JSON.stringify(body));
    }

    detectContentType(body: any): string | null {
        if (Buffer.isBuffer(body)) return 'application/octet-stream';
        if (typeof body === 'string') return 'text/plain';
        return 'application/json';
    }

    canHandle(body: any): boolean {
        return body !== undefined;
    }
}

export const AmqpBodySerializeStrategyToken = 'BODY_SERIALIZE_STRATEGY';