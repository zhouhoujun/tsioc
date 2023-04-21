import { getTokenOf, Token, ProvdierOf, TypeOf, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Handler } from './Handler';

/**
 * Interceptor is a chainable behavior modifier for `hanlders`.
 * 
 * 拦截器，用于链接多个处理器，组合成处理器串。
 */
export interface Interceptor<TInput = any, TOutput = any> {
    /**
     * the method to implemet interceptor.
     * 
     * 实现拦截处理的方法
     * @param input  request input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(input: TInput, next: Handler<TInput, TOutput>): Observable<TOutput>;
}

/**
 * interceptor service.
 * 
 * 拦截器服务
 */
export interface InterceptorService {
    /**
     * use interceptors
     * 
     * 使用拦截器
     * @param interceptors 
     * @param order 
     */
    useInterceptors(interceptors: ProvdierOf<Interceptor> | ProvdierOf<Interceptor>[], order?: number): this;
}

/**
 * Interceptors multi token
 * 
 * 拦截器组的标识令牌
 */
export const INTERCEPTORS_TOKEN = tokenId<Interceptor[]>('INTERCEPTORS_TOKEN');

const INTERCEPTORS = 'INTERCEPTORS';
/**
 * get target filters token.
 * @param request 
 * @returns 
 */
export function getInterceptorsToken(type: TypeOf<any> | string, propertyKey?: string): Token<Interceptor[]> {
    return getTokenOf(type, INTERCEPTORS, propertyKey);
}

