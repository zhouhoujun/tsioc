import {
    getTokenOf, Token, ProvdierOf, TypeOf, tokenId, Abstract, Type,
    Interceptor as IInterceptor, InterceptorFn as IInterceptorFn, InterceptorLike as IInterceptorLike
} from '@tsdi/ioc';
import { Observable } from 'rxjs';


// export { Interceptor, InterceptorFn, InterceptorLike } from '@tsdi/ioc';

/**
 * Interceptor is a chainable behavior modifier for `hanlders`.
 * 
 * 拦截器，用于链接多个处理器，组合成处理器串。
 */
export interface Interceptor<TInput = any, TOutput = any, TContext = any> extends IInterceptor<TInput, Observable<TOutput>, TContext> {

}

/**
 * InterceptorFn is a chainable behavior modifier for `hanlders`.
 * 拦截方法，用于链接多个处理器，组合成处理器串。
 */
export type InterceptorFn<TInput = any, TOutput = any, TContext = any> = IInterceptorFn<TInput, Observable<TOutput>, TContext>;

export type InterceptorLike<TInput = any, TOutput = any, TContext = any> = IInterceptorLike<TInput, Observable<TOutput>, TContext>

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
    return getTokenOf<Interceptor[]>(type, 'INTERCEPTORS', propertyKey);
}

/**
 * Interceptor resolver.
 */
@Abstract()
export abstract class InterceptorResolver {
    /**
     * resolve hanlde interceptor.
     * @param target 
     */
    abstract resolve<T>(target: Type<T> | T | string): InterceptorLike[];
    /**
     * add handle interceptor.
     * @param target interceptor for the target type
     * @param interceptor handler interceptor.
     * @param order order.
     */
    abstract addInterceptor(target: Type | string, interceptor: InterceptorLike, order?: number): this;
    /**
     * remove handle interceptor.
     * @param target interceptor for the target type
     * @param interceptor handler interceptor.
     */
    abstract removeInterceptor(target: Type | string, interceptor: InterceptorLike): this;
}
