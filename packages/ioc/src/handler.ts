import { from, isObservable, Observable, of } from 'rxjs';
import { isFunction, isPromise } from './utils/chk';

/**
 * `Handler` is the fundamental building block of handle.
 * 
 * 处理器基本构建块。
 */
export interface Handler<TInput = any, TOutput = any, TContext = any> {
    /**
     * handle.
     * 
     * 处理句柄
     * @param input handle input.
     * @param context handle with context.
     */
    handle(input: TInput, context?: TContext): Observable<TOutput> | Promise<TOutput> | TOutput;

    /**
     * is this equals to target or not
     * 
     * 该实例等于目标与否？
     * @param target 
     */
    equals?(target: any): boolean;
}

/**
 * handler fn.
 * 处理器基本构建块。
 */
export type HandlerFn<TInput = any, TOutput = any, TContext = any> = (input: TInput, context?: TContext) => Observable<TOutput> | Promise<TOutput> | TOutput;

/**
 * Interceptor is a chainable behavior modifier for `hanlders`.
 * 
 * 拦截器，用于链接多个处理器，组合成处理器串。
 */
export interface Interceptor<TInput = any, TOutput = any, TContext = any> {
    /**
     * the method to implemet interceptor.
     * 
     * 实现拦截处理的方法
     * @param input  request input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @param context interceptor with context.
     * @returns An observable of the event stream.
     */
    intercept(input: TInput, next: Handler, context?: TContext): Observable<TOutput> | Promise<TOutput> | TOutput;

    /**
     * is this equals to target or not
     * 
     * 该实例等于目标与否？
     * @param target 
     */
    equals?(target: any): boolean;
}

/**
 * interceptor fn.
 * 拦截方法，用于链接多个处理器，组合成处理器串。
 */
export type InterceptorFn<TInput = any, TOutput = any, TContext = any> = (input: TInput, next: HandlerFn, context?: TContext) => Observable<TOutput> | Promise<TOutput> | TOutput;

/**
 * interceptor like.
 */
export type InterceptorLike<TInput = any, TOutput = any, TContext = any> = Interceptor<TInput, TOutput, TContext> | InterceptorFn<TInput, TOutput, TContext>;



/**
 * compose chain interceptor.
 * @param interceptors 
 * @returns 
 */
export function composeInterceptors(interceptors: InterceptorLike[]): InterceptorFn {
    return interceptors.reduceRight((next, interceptorFn) => chainedInterceptorFn(next as InterceptorFn, interceptorFn), chainEndFn as InterceptorFn) as InterceptorFn;
}


function chainEndFn(req: any, finalHandlerFn: HandlerFn, context?: any): Observable<any> {
    return finalHandlerFn(req, context);
}

/**
 * Constructs a `ChainedInterceptorFn` which wraps and invokes a functional interceptor.
 */
function chainedInterceptorFn(
    chainTailLike: InterceptorLike, interceptorLike: InterceptorLike,
): InterceptorFn {

    const chainTailFn = isFunction(chainTailLike) ? chainTailLike : (req: any, handle: HandlerFn, context?: any) => chainTailLike.intercept(req, {
        handle,
    }, context);
    const interceptorFn = isFunction(interceptorLike) ? interceptorLike : (req: any, handle: HandlerFn, context?: any) => interceptorLike.intercept(req, {
        handle,
    }, context);

    return chainFactory(chainTailFn, interceptorFn)
}

export function chainFactory(chainTailFn: InterceptorFn, interceptorFn: InterceptorFn): InterceptorFn {
    return (initialRequest, finalHandlerFn, context?: any) =>
        interceptorFn(
            initialRequest,
            (downstreamRequest, ctx?: any) => chainTailFn(downstreamRequest, finalHandlerFn, ctx ?? context),
            context
        )
}

/**
 * observable handler factory.
 * @param fn 
 * @returns 
 */
export function observableHandlerFactory<TInput = any, TOutput = any, TContext = any>(fn: (ctx: TInput, context?: TContext) => TOutput | Observable<TOutput> | Promise<TOutput>) {
    const handle = (input: TInput, context?: TContext): Observable<TOutput> => {
        const $res = fn(input, context);
        if (isObservable($res)) {
            return $res;
        }
        return isPromise($res) ? from($res) : of($res);
    };

    return {
        handle
    }
}
