import { getTokenOf, Token, ProvdierOf, TypeOf, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Handler } from './Handler';

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
    intercept(input: TInput, next: Handler, context?: TContext): Observable<TOutput>;
}

/**
 * InterceptorFn is a chainable behavior modifier for `hanlders`.
 * 拦截方法，用于链接多个处理器，组合成处理器串。
 */
export type InterceptorFn<TInput = any, TOutput = any, TContext = any> = (input: TInput, next: Handler, context?: TContext) => Observable<TOutput>;

export type InterceptorLike<TInput = any, TOutput = any, TContext = any> = Interceptor<TInput, TOutput, TContext> | InterceptorFn<TInput, TOutput, TContext>;

export interface InterceptorService {
    /**
     * use interceptors
     * 
     * 使用拦截器
     * @param interceptors 
     * @param order 
     */
    useInterceptors(interceptors: ProvdierOf<InterceptorLike> | ProvdierOf<InterceptorLike>[], order?: number): this;
}

/**
 * Interceptors multi token
 * 
 * 拦截器组的标识令牌
 */
export const INTERCEPTORS_TOKEN = tokenId<Interceptor[]>('INTERCEPTORS_TOKEN');


/**
 * get target filters token.
 * @param request 
 * @returns 
 */
export function getInterceptorsToken(type: TypeOf<any> | string, propertyKey?: string): Token<Interceptor[]> {
    return getTokenOf(type, 'INTERCEPTORS', propertyKey);
}
