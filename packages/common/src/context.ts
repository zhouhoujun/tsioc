import { Context, ContextToken, Injector, Token } from '@tsdi/ioc';
import { RunContext } from '@tsdi/core';
import { ContentType } from './headers';


export const CONTENT_LENGTH = new ContextToken<number | null>(() => null);
export const CONTENT_TYPE = new ContextToken<string | null>(() => ContentType.APPL_JSON);
export const CONTENT_ENCODING = new ContextToken<string | null>(() => null);

export const PROTOCOL = new ContextToken<string | undefined>(() => undefined);

export class RequestContext extends RunContext {

    getProtocol(): string | undefined {
        return this.get(PROTOCOL);
    }
    setProtocol(value: string | undefined) {
        this.set(PROTOCOL, value);
    }

    /**
     * set request encoding.
     * @returns 
     */
    getContentEncoding(): string | null {
        return this.get(CONTENT_ENCODING)
    }

    /**
     * set content encoding.
     * @param encoding 
     */
    setContentEncoding(encoding: string | null) {
        this.set(CONTENT_ENCODING, encoding);
    }
    /**
     * get content type
     * @param type 
     */
    getContentType(): string | null | undefined {
        return this.get(CONTENT_TYPE);
    }
    /**
     * set content type
     * @param type 
     */
    setContentType(type: string | null | undefined) {
        this.set(CONTENT_TYPE, type);
    }


    getContentLength(): number | null {
        return this.get(CONTENT_LENGTH);
    }

    setContentLength(len: number | null) {
        this.set(CONTENT_LENGTH, len);
    }

}

export function createRequestContext(injector: Injector, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(injector: Injector, previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(injector: Injector, previous?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
    const context = new RequestContext(injector, previous ?? entries, entries);
    return context;
}

