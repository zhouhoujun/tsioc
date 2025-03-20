import {
    getTokenOf, Token, ProvdierOf, TypeOf, tokenId, Abstract, Type,
    Interceptor, InterceptorFn, InterceptorLike
} from '@tsdi/ioc';
import { Observable } from 'rxjs';

/**
 * Application interceptor is a chainable behavior modifier for `hanlders`.
 * 
 * 拦截器，用于链接多个处理器，组合成处理器串。
 */
export interface ApplicationInterceptor<TInput = any, TOutput = any, TContext = any> extends Interceptor<TInput, Observable<TOutput>, TContext> {

}

/**
 * InterceptorFn is a chainable behavior modifier for `hanlders`.
 * 拦截方法，用于链接多个处理器，组合成处理器串。
 */
export type ApplicationInterceptorFn<TInput = any, TOutput = any, TContext = any> = InterceptorFn<TInput, Observable<TOutput>, TContext>;

export type ApplicationInterceptorLike<TInput = any, TOutput = any, TContext = any> = InterceptorLike<TInput, Observable<TOutput>, TContext>

export interface InterceptorService {
    /**
     * use interceptors
     * 
     * 使用拦截器
     * @param interceptors 
     * @param order 
     */
    useInterceptors(interceptors: ProvdierOf<ApplicationInterceptorLike> | ProvdierOf<ApplicationInterceptorLike>[], order?: number): this;
}

/**
 * Interceptors multi token
 * 
 * 拦截器组的标识令牌
 */
export const INTERCEPTORS_TOKEN = tokenId<ApplicationInterceptor[]>('INTERCEPTORS_TOKEN');


/**
 * get target filters token.
 * @param request 
 * @returns 
 */
export function getInterceptorsToken(type: TypeOf<any> | string, propertyKey?: string): Token<ApplicationInterceptor[]> {
    return getTokenOf<ApplicationInterceptor[]>(type, 'INTERCEPTORS', propertyKey);
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
    abstract resolve<T>(target: Type<T> | T | string): ApplicationInterceptorLike[];
    /**
     * add handle interceptor.
     * @param target interceptor for the target type
     * @param interceptor handler interceptor.
     * @param order order.
     */
    abstract addInterceptor(target: Type | string, interceptor: ApplicationInterceptorLike, order?: number): this;
    /**
     * remove handle interceptor.
     * @param target interceptor for the target type
     * @param interceptor handler interceptor.
     */
    abstract removeInterceptor(target: Type | string, interceptor: ApplicationInterceptorLike): this;
}
