import { AbstractType, ContextToken, Handler, HandleResult, HandlerFn, Injector, isBoolean, ResolveContext, TailNext } from '@tsdi/ioc';


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

/**
 * `ApplicationHandler` is the fundamental building block of handle.
 * 
 * 处理器基本构建块。
 */
export interface ApplicationHandler<TInput = any, TOutput = any, TContext extends RunableContext = RunableContext> extends Handler<TInput, TOutput, TContext> {
    /**
     * handle.
     * 
     * 处理句柄
     * @param input handle input.
     * @param context handle with context.
     * @param tail the next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     */
    handle(input: TInput, context: TContext, tail?: TailNext<TOutput, TContext>): HandleResult<TOutput>;

}

/**
 * Application handler fn.
 */
export type ApplicationHandlerFn<TInput = any, TOutput = any, TContext extends RunableContext = RunableContext> = HandlerFn<TInput, TOutput, TContext>;

/**
 * Application handler like.
 */
export type ApplicationHandlerLike<TInput = any, TOutput = any, TContext extends RunableContext = RunableContext> = ApplicationHandlerFn<TInput, TOutput, TContext> | ApplicationHandler<TInput, TOutput, TContext>;
