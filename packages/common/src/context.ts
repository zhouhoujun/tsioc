import { Context, ContextToken, Injector, Token } from '@tsdi/ioc';
import { RunContext } from '@tsdi/core';



const PROTOCOL = new ContextToken<string | undefined>(() => undefined);

export class RequestContext extends RunContext {

    getProtocol(): string | undefined {
        return this.get(PROTOCOL);
    }
    setProtocol(value: string | undefined) {
        this.set(PROTOCOL, value);
    }
}

export function createRequestContext(injector: Injector, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(injector: Injector, previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(injector: Injector, previous?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
    const context = new RequestContext(injector, previous ?? entries, entries);
    return context;
}

