import { Context, Injector, Token } from '@tsdi/ioc';

export { Handler, HandlerLike, HandlerFn } from '@tsdi/ioc';


export class RunableContext extends Context {

    constructor(injector: Injector, entries?: readonly [Token, any][]) {
        super(entries)
        this.set(Injector, injector);
    }

    getInjector() {
        return this.get(Injector)
    }

}


export function createRunableContext(injector: Injector, entries?: readonly [Token, any][]) {
    return new RunableContext(injector, entries)
}

