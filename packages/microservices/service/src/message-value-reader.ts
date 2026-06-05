import { Injectable } from '@tsdi/ioc';
import { MessageValueReader } from '@tsdi/core';
import { MessageAdapter, RequestContext } from '@tsdi/common';

@Injectable()
export class ServiceMessageValueReader extends MessageValueReader {
    read(section: string, name: string | undefined, context: RequestContext): any {
        const adapter = context.get(MessageAdapter);
        if (adapter) {
            return adapter.read(section as any, name);
        }
        const input = context.getPayload() as Record<string, any> | undefined;
        if (!input || !section) {
            return undefined;
        }
        const scopeVal = section === 'path'
            ? (input.paths ?? input.path)
            : section === 'query'
                ? (input.query ?? input.params)
                : section === 'payload'
                    ? (input.payload ?? input.body)
                    : section === 'body'
                        ? (input.body ?? input.payload)
                        : input[section];
        return name && scopeVal ? scopeVal[name] : scopeVal;
    }
}
