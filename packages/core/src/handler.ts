import { Context, ContextToken, DefaultContext, Injector, Token } from '@tsdi/ioc';

export { Handler, HandlerLike, HandlerFn } from '@tsdi/ioc';


export class RunableContext extends DefaultContext {

    setInjector(injector: Injector) {
        this.set(Injector, injector);
    }

    getInjector() {
        return this.get(Injector)
    }

}


export function createRunableContext(injector: Injector, previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>) {
    const context = new RunableContext(previous ?? entries, entries);
    context.setInjector(injector);
    return context;
}

