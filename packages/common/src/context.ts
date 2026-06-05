import { Context, ContextToken, Injector, Token, RunContext } from '@tsdi/ioc';
import { ContentType } from './headers';
import { MessageAdapter, RestfulRequestAdapter, StatusMessageAdapter } from './MessageAdapter';

const CONTENT_LENGTH = new ContextToken<number | null>(() => null);
const CONTENT_TYPE = new ContextToken<string | null>(() => ContentType.APPL_JSON);
const CONTENT_ENCODING = new ContextToken<string | null>(() => null);

export class RequestContext<TRequest = any, TResponse = any> extends RunContext {

    getRequest(): TRequest {
        return this.get(MessageAdapter).req as TRequest;
    }

    getResponse(): TResponse {
        return this.get(MessageAdapter).res as TResponse;
    }

    getMessageAdapter<TReq = TRequest, TRes = TResponse>(): MessageAdapter<TReq, TRes> {
        return this.get(MessageAdapter) as MessageAdapter<TReq, TRes>;
    }

    setMessageAdapter(adapter: MessageAdapter<TRequest, TResponse>) {
        if (!(adapter instanceof MessageAdapter)) return;
        this.set(MessageAdapter, adapter);
        if (!(adapter instanceof StatusMessageAdapter)) return;
        this.set(StatusMessageAdapter, adapter);

        if (!(adapter instanceof RestfulRequestAdapter)) return;
        this.set(RestfulRequestAdapter, adapter);

    }

    getContentEncoding(): string | null {
        return this.get(CONTENT_ENCODING);
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
