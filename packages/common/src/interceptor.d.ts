import { HandlerFn, Interceptor } from '@tsdi/ioc';
import { RequestHandler, RequestHandlerFn } from './handler';
import { Observable } from 'rxjs';
import { RequestContext } from './context';
/**
 * Request interceptor.
 * 请求拦截器。
 */
export interface RequestInterceptor<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> extends Interceptor<TInput, Observable<TOutput>, TContext> {
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
    intercept(input: TInput, next: RequestHandler<TInput, TOutput, TContext>, context: TContext): Observable<TOutput>;
}
/**
 * Request interceptor function is a chainable behavior modifier for `hanlders`.
 * 拦截方法，用于链接多个处理器，组合成处理器串。
 */
export type RequestInterceptorFn<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> = (input: TInput, next: RequestHandlerFn<TInput, TOutput, TContext> | HandlerFn<TInput, Observable<TOutput>, TContext>, context: TContext) => Observable<TOutput>;
/**
 * Request interceptor like.
 */
export type RequestInterceptorLike<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> = RequestInterceptorFn<TInput, TOutput, TContext> | RequestInterceptor<TInput, TOutput, TContext>;
