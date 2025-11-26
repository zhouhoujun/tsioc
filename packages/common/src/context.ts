import { Context, ContextToken, DefaultContext, Injector, Token } from '@tsdi/ioc';


export class RequestContext extends DefaultContext {

    setInjector(injector: Injector) {
        this.set(Injector, injector);
    }

    getInjector() {
        return this.get(Injector)
    }

}

export function createRequestContext(entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(previous?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
    const context = new RequestContext(previous ?? entries, entries);
    return context;
}

