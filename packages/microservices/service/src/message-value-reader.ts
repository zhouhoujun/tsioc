import { Injectable, isNil, isObject } from '@tsdi/ioc';
import { MessageValueReader, ReadResult } from '@tsdi/core';
import { MessageAdapter } from '@tsdi/common';

@Injectable()
export class ServiceMessageValueReader extends MessageValueReader {
    read(name: string | undefined, payload: any, section?: string): ReadResult {
        if (isNil(payload) || !section) {
            return { success: false, value: undefined };
        }
        if (payload instanceof MessageAdapter) {
            const value = payload.read(section as any, name);
            return isNil(value)
                ? { success: false, value: undefined }
                : { success: true, value };
        }
        const isEnvelope = 'body' in payload
            || 'payload' in payload
            || 'query' in payload
            || 'params' in payload
            || 'headers' in payload
            || 'paths' in payload
            || 'path' in payload
            || 'topic' in payload
            || 'url' in payload
            || 'pattern' in payload;
        const scopeVal = section === 'path'
            ? (payload.paths ?? payload.path)
            : section === 'query'
                ? (payload.query ?? payload.params)
                : section === 'payload'
                    ? (payload.payload ?? payload.body)
                    : section === 'body'
                        ? (payload.body ?? payload.payload ?? (!isEnvelope ? payload : undefined))
                        : payload[section];
        if (isNil(scopeVal)) {
            return { success: false, value: undefined };
        }
        const value = name ? scopeVal[name] : scopeVal;
        if (!name) {
            return { success: true, value: scopeVal };
        }
        if (!isNil(value)) {
            return { success: true, value };
        }
        if (section === 'body') {
            return { success: true, value: scopeVal };
        }
        if (isObject(scopeVal)) {
            return { success: false, value: undefined };
        }
        return { success: true, value: scopeVal };
    }
}
