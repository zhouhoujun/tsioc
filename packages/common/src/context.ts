import { Context, ContextToken, Injector, Token, tokenId } from '@tsdi/ioc';
import { RunContext } from '@tsdi/core';
import { Protocols } from './protocols';



const PROTOCOL = tokenId<Protocols>('Protocol');

export class RequestContext extends RunContext {

    get protocol(): Protocols {
        return this.get(PROTOCOL);
    }
    set protocol(value: Protocols) {
        this.set(PROTOCOL, value);
    }
}

export function createRequestContext(injector: Injector, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(injector: Injector, previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(injector: Injector, previous?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
    const context = new RequestContext(previous ?? entries, entries);
    context.setInjector(injector);
    return context;
}

