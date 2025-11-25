import { Context, DefaultContext, Injector } from '@tsdi/ioc';

export { Handler, HandlerLike, HandlerFn } from '@tsdi/ioc';


export class RunableContext extends DefaultContext {
    getInjector() {
        return this.get(Injector)
    }

}


export function createRunableContext(injector: Injector, previous?: Context) {
    const context = new RunableContext(previous);
    context.set(Injector, injector);
    return context;
}

