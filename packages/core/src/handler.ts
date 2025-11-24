import { AbstractType, ContextToken, Injector, isBoolean, ResolveContext } from '@tsdi/ioc';

export { Handler, HandlerLike, HandlerFn } from '@tsdi/ioc';


const BOOTSTRAP = new ContextToken<boolean>(() => false);

export class RunableContext extends ResolveContext {

    constructor(injector: Injector,
        bootstrap?: boolean,
        failed?: (target: AbstractType, propertyKey: string) => void) {
        super(injector, failed)
        if (isBoolean(bootstrap)) this.set(BOOTSTRAP, bootstrap);
    }

    getBootstrap() {
        return this.get(BOOTSTRAP);
    }
}


export function createRunableContext(injector: Injector,
    bootstrap?: boolean,
    failed?: (target: AbstractType, propertyKey: string) => void) {
    return new RunableContext(injector, bootstrap, failed)
}

