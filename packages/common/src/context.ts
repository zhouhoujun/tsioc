import { Context, ContextToken, Token, tokenId } from '@tsdi/ioc';
import { RunableContext } from '@tsdi/core';
import { Protocols } from './protocols';



const PROTOCOL = tokenId<Protocols>('Protocol');

export class RequestContext extends RunableContext {

    getProtocol(): Protocols {
        return this.get(PROTOCOL);
    }
    setProtocol(value: Protocols) {
        this.set(PROTOCOL, value);
    }
}

export function createRequestContext(entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(previous?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
    const context = new RequestContext(previous ?? entries, entries);
    return context;
}

