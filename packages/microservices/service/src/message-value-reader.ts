import { Injectable, isNil, isObject } from '@tsdi/ioc';
import { MessageValueReader, ReadResult } from '@tsdi/core';

@Injectable()
export class ServiceMessageValueReader extends MessageValueReader {
    read(name: string | undefined, payload: any, section?: string): ReadResult {
        if (isNil(payload) || !section) {
            return { success: false, value: undefined };
        }
        const scopeVal = section === 'path'
            ? (payload.paths ?? payload.path)
            : section === 'query'
                ? (payload.query ?? payload.params)
                : section === 'payload'
                    ? (payload.payload ?? payload.body)
                    : section === 'body'
                        ? (payload.body ?? payload.payload)
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
        // For body scope, fall back to whole section (@RequestBody() shorthand).
        if (section === 'body') {
            return { success: true, value: scopeVal };
        }
        // Name specified but not found in object scope → failure.
        if (isObject(scopeVal)) {
            return { success: false, value: undefined };
        }
        // Scalar scopeVal → return as-is.
        return { success: true, value: scopeVal };
    }
}
