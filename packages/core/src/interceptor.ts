import { token, Abstract, AbstractType, Interceptor, InterceptorLike } from '@tsdi/ioc';

export { Interceptor, InterceptorFn, InterceptorLike } from '@tsdi/ioc';

/**
 * Interceptors multi token
 * 
 * 拦截器组的标识令牌
 */
export const INTERCEPTORS_TOKEN = token<Interceptor[]>('INTERCEPTORS_TOKEN');


/**
 * Interceptor resolver.
 */
@Abstract()
export abstract class InterceptorResolver {
    /**
     * resolve hanlde interceptor.
     * @param target 
     */
    abstract resolve<T>(target: AbstractType<T> | T | string): InterceptorLike[];
    /**
     * add handle interceptor.
     * @param target interceptor for the target type
     * @param interceptor handler interceptor.
     * @param order order.
     */
    abstract addInterceptor(target: AbstractType | string, interceptor: InterceptorLike, order?: number): this;
    /**
     * remove handle interceptor.
     * @param target interceptor for the target type
     * @param interceptor handler interceptor.
     */
    abstract removeInterceptor(target: AbstractType | string, interceptor: InterceptorLike): this;
}
