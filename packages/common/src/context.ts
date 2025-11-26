import { Context, ContextToken, Token } from '@tsdi/ioc';
import { RunableContext } from '@tsdi/core';


export class RequestContext extends RunableContext {

}

export function createRequestContext(entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(previous?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
    const context = new RequestContext(previous ?? entries, entries);
    return context;
}

