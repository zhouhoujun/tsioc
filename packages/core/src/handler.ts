import { Context, ContextToken, DefaultContext, Injector, Token } from '@tsdi/ioc';

export { Handler, HandlerLike, HandlerFn } from '@tsdi/ioc';


export class RunContext extends DefaultContext {

    setInjector(injector: Injector) {
        this.set(Injector, injector);
    }

    getInjector() {
        return this.get(Injector)
    }

    protected getToken<T>(token: Token<T>) {
        return this.map.get(token) ?? this.getFromInjector(token)
    }

    protected getFromInjector<T>(token: Token<T>) {
        const value = this.getInjector().get(token);
        this.set(token, value);
        return value;
    }

}


export function createRunContext(injector: Injector, entries?: Iterable<readonly [Token | ContextToken, any]>): RunContext;
export function createRunContext(injector: Injector, previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RunContext;
export function createRunContext(injector: Injector, previous?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
    const context = new RunContext(previous ?? entries, entries);
    context.setInjector(injector);
    return context;
}

