import { AbstractType, ContextToken, Handler, HandlerFn, HandlerLike, Injector, isBoolean, ResolveContext } from '@tsdi/ioc';
import { Observable } from 'rxjs';


const BOOTSTRAP = new ContextToken<boolean>(() => false);

export class RunableContext extends ResolveContext {

    constructor(injector: Injector,
        readonly target?: AbstractType,
        bootstrap?: boolean,
        failed?: (target: AbstractType, propertyKey: string) => void) {
        super(injector, target, failed)
        if (isBoolean(bootstrap)) this.set(BOOTSTRAP, bootstrap);
    }

    getBootstrap() {
        return this.get(BOOTSTRAP);
    }
}


export function createRunableContext(injector: Injector,
    target?: AbstractType,
    bootstrap?: boolean,
    failed?: (target: AbstractType, propertyKey: string) => void) {
    return new RunableContext(injector, target, bootstrap, failed)
}

/**
 * `ApplicationHandler` is the fundamental building block of handle.
 * 
 * 处理器基本构建块。
 */
export interface ApplicationHandler<TInput = any, TOutput = any, TContext extends RunableContext = RunableContext> extends Handler<TInput, Observable<TOutput>, TContext> {
    /**
     * handle.
     * 
     * 处理句柄
     * @param input handle input.
     * @param context handle with context.
     */
    handle(input: TInput, context: TContext): Observable<TOutput>;
}

/**
 * Application handler fn.
 */
export type ApplicationHandlerFn<TInput = any, TOutput = any, TContext extends RunableContext = RunableContext> = HandlerFn<TInput, Observable<TOutput>, TContext>;

/**
 * Application handler like.
 */
export type ApplicationHandlerLike<TInput = any, TOutput = any, TContext extends RunableContext = RunableContext> = HandlerLike<TInput, Observable<TOutput>, TContext>;
