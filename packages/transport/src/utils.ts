import { isFunction, isString } from '@tsdi/ioc';
import { Stream } from 'stream';
import { EventEmitter } from 'events'


export function isBuffer(body: any): body is Buffer {
    return Buffer.isBuffer(body);
}

export function isStream(body: any): body is Stream {
    return body instanceof Stream || (body instanceof EventEmitter && isFunction((body as Stream).pipe));
}

export function isJson(body: any) {
    if (!body) return false;
    if (isString(body)) return false;
    if (isStream(body)) return false;
    if (isBuffer(body)) return false;
    return true;
}
