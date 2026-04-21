import { Handler, HandlerLike } from './handler';
import { Interceptor, InterceptorFn, InterceptorLike } from './interceptor';
import { TailNext } from './handler';
/**
 * intercepting hnalder.
 */
export declare class InterceptingHandler<TInput = any, TOutput = any, TContext = any> implements Handler<TInput, TOutput, TContext> {
    protected interceptors: InterceptorLike[] | (() => InterceptorLike[]);
    private chain?;
    private backend;
    constructor(backend: HandlerLike<TInput, TOutput, TContext>, interceptors: InterceptorLike[] | (() => InterceptorLike[]));
    handle(input: TInput, context: TContext, tail?: TailNext<TOutput, TContext>): TOutput;
    protected reset(): void;
    protected compose(): InterceptorFn<TInput, TOutput, TContext>;
}
/**
 * compose interceptor.
 */
export declare class ComposeInterceptor<TInput = any, TOutput = any, TContext = any> implements Interceptor<TInput, TOutput, TContext> {
    protected interceptors: InterceptorLike[];
    private chain?;
    constructor(interceptors: InterceptorLike[]);
    intercept(input: TInput, next: Handler<TInput, TOutput, TContext>, context: TContext): TOutput;
    protected reset(): void;
    protected compose(): InterceptorFn<TInput, TOutput, TContext>;
}
