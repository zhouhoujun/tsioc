import { Context, ContextToken, Injector, Token, RunContext } from '@tsdi/ioc';
import { ContentType } from './headers';
import { MessageAdapter, RestfulRequestAdapter, StatusMessageAdapter } from './MessageAdapter';

export const CONTENT_LENGTH = new ContextToken<number | null>(() => null);
export const CONTENT_TYPE = new ContextToken<string | null>(() => ContentType.APPL_JSON);
export const CONTENT_ENCODING = new ContextToken<string | null>(() => null);

export class RequestContext<TRequest = any, TResponse = any> extends RunContext {

    getRequest(): TRequest {
        return this.get(MessageAdapter).request as TRequest;
    }

    getResponse(): TResponse {
        return this.get(MessageAdapter).response as TResponse;
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

}

export function createRequestContext<TRequest = any, TResponse = any>(injector: Injector, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext<TRequest, TResponse>;
export function createRequestContext<TRequest = any, TResponse = any>(injector: Injector, previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext<TRequest, TResponse>;
export function createRequestContext<TRequest = any, TResponse = any>(injector: Injector, previous?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
    const context = new RequestContext<TRequest, TResponse>(previous ?? entries, entries);
    context.setInjector(injector);
    return context;
}
