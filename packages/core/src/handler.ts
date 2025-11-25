import { Context, ContextToken, DefaultContext, Injector, Token } from '@tsdi/ioc';

export { Handler, HandlerLike, HandlerFn } from '@tsdi/ioc';


export class RunableContext extends DefaultContext {
    getInjector() {
        return this.get(Injector)
    }

}


export function createRunableContext(injector: Injector, previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>) {
    const context = new RunableContext(previous ?? entries, entries);
    context.set(Injector, injector);
    return context;
}

