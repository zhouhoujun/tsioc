import { AbstractType, ContextToken, Handler, HandlerLike, Injector, isBoolean, ResolveContext } from '@tsdi/ioc';
import { Observable } from 'rxjs';


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
export interface ApplicationHandler<TInput = any, TOutput = any, TContext extends RunableContext = RunableContext> {
    /**
     * handle.
     * 
     * 处理句柄
     * @param input handle input.
     * @param context handle with context.
     */
    handle(input: TInput, context: TContext): Observable<TOutput>;

    /**
     * is this equals to target or not
     * 
     * 该实例等于目标与否？
     * @param target 
     */
    equals?(target: any): boolean;
}

/**
 * Application handler fn.
 */
export type ApplicationHandlerFn<TInput = any, TOutput = any, TContext extends RunableContext = RunableContext> = (input: TInput, context: TContext) => Observable<TOutput>;

/**
 * Application handler like.
 */
export type ApplicationHandlerLike<TInput = any, TOutput = any, TContext extends RunableContext = RunableContext> = HandlerLike<TInput, Observable<TOutput>, TContext>;
