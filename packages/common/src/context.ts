import { Context, ContextToken, Injector, Token, RunContext } from '@tsdi/ioc';
import { MessageSection } from '@tsdi/core';
import { ContentType } from './headers';
import { MessageAdapter } from './MessageAdapter';


const CONTENT_LENGTH = new ContextToken<number | null>(() => null);
const CONTENT_TYPE = new ContextToken<string | null>(() => ContentType.APPL_JSON);
const CONTENT_ENCODING = new ContextToken<string | null>(() => null);


export const REQUEST = new ContextToken<any | null>(() => null);
export const RESPONSE = new ContextToken<any | null>(() => null);
export const MESSAGE_ADAPTER = new ContextToken<MessageAdapter<any, any> | null>(() => null);


export class RequestContext<TRequest = any, TResponse = any> extends RunContext {

    getMessageAdapter<TReq = TRequest, TRes = TResponse>(): MessageAdapter<TReq, TRes> | null {
        return this.get(MESSAGE_ADAPTER);
    }

    setMessageAdapter<TReq = TRequest, TRes = TResponse>(adapter: MessageAdapter<TReq, TRes> | null) {
        this.set(MESSAGE_ADAPTER, adapter);
    }

    readMessage(section: MessageSection, name?: string): any {
        return this.getMessageAdapter()?.read(section, name);
    }

    writeMessage(body: any) {
        this.getMessageAdapter()?.write(body);
    }

    setHeader(name: string, value: any) {
        this.getMessageAdapter()?.setHeader(name, value);
    }

    removeHeader(name: string) {
        this.getMessageAdapter()?.removeHeader(name);
    }

    setStatus(code: any, message?: string) {
        this.getMessageAdapter()?.setStatus(code, message);
    }

    writeError(error: any) {
        this.getMessageAdapter()?.writeError(error);
    }

    getContentEncoding(): string | null {
        return this.get(CONTENT_ENCODING)
    }

    setContentEncoding(encoding: string | null) {
        this.set(CONTENT_ENCODING, encoding);
    }

    getContentType(): string | null | undefined {
        return this.get(CONTENT_TYPE);
    }

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

export function createRequestContext<TRequest = any, TResponse = any>(injector: Injector, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext<TRequest, TResponse>;
export function createRequestContext<TRequest = any, TResponse = any>(injector: Injector, previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext<TRequest, TResponse>;
export function createRequestContext<TRequest = any, TResponse = any>(injector: Injector, previous?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
    const context = new RequestContext<TRequest, TResponse>(previous ?? entries, entries);
    context.setInjector(injector);
    return context;
}
