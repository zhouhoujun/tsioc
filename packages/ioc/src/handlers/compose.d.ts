import { Observable } from 'rxjs';
import { Handler, HandlerFn, HandlerLike } from './handler';
import { InterceptorFn, InterceptorLike } from './interceptor';
import { TailNext } from './handler';
/**
 * compose chain interceptor.
 * @param interceptors
 * @returns
 */
export declare function composeInterceptors(interceptors: InterceptorLike[]): InterceptorFn;
export declare function chainEndFn(req: any, finalHandlerFn: HandlerFn, context: any): any;
export declare function chainFactory(chainTailFn: InterceptorFn, interceptorFn: InterceptorFn): InterceptorFn;
declare const handleFn: unique symbol;
export declare function toHandlerFn(handler: Handler & {
    [handleFn]?: HandlerFn;
}): HandlerFn;
/**
 * parse handle result to `Observable`
 */
export declare function toObservable<T>(res: any): Observable<T>;
/**
 * parse  target to `Promise`
 */
export declare function toPromise<T>(res: any): Promise<T>;
export declare function invokeTail<T = any, TContext = any>(invoke: (input?: any, context?: TContext) => T, tail: TailNext<any, TContext>, input?: any, context?: TContext): T;
export declare function invokeTail<T = any, TContext = any>(invoke: (input: any, context: TContext) => T, tail: TailNext<any, TContext>, input: any, context: TContext): T;
export declare function invokeTail<T = any, TContext = any>(invoke: (input: any, arg2: any, context: TContext) => T, tail: TailNext<any, TContext>, input: any, arg2: any, context: TContext): T;
/**
 * 处理多个连续的invoke调用
 */
export declare function invokeTails<T = any, TContext = any>(invoke: () => any, next: TailNext<any, TContext>, ...nexts: (TailNext<any, TContext> | undefined)[]): T;
export declare function invokeTails<T = any, TContext = any>(invoke: () => any, ...nexts: (TailNext<any, TContext> | undefined)[]): T;
export declare function invokeTails<T = any, TContext = any>(invoke: () => any, ...invokes: ((res?: any, context?: TContext) => any)[]): T;
/**
 * compose chain handlers.
 * @param hanlders
 * @param interceptor
 * @returns
 */
export declare function composeHandlers(hanlders: HandlerLike[], interceptor?: (res: any, nextFn: HandlerFn, input: any, context?: any) => any): HandlerFn;
export {};
