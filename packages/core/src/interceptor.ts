import {
    getTokenOf, Token, ProvdierOf, TypeOf, tokenId, Abstract, AbstractType,
    Interceptor, InterceptorLike, Context
} from '@tsdi/ioc';
import { RequestHandler, RequestHandlerFn } from './handler';
import { Observable } from 'rxjs';

export { Interceptor, InterceptorFn, InterceptorLike } from '@tsdi/ioc';


export interface RequestInterceptor<TInput = any, TOutput = any, TContext extends Context = Context> extends Interceptor<TInput, TOutput, TContext> {

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
export type RequestInterceptorFn<TInput = any, TOutput = any, TContext extends Context = Context> = (input: TInput, next: RequestHandlerFn<TInput, TOutput, TContext>, context: TContext) => Observable<TOutput>;


/**
 * Request interceptor like.
 */
export type RequestInterceptorLike<TInput = any, TOutput = any, TContext extends Context = Context> = RequestInterceptorFn<TInput, TOutput, TContext> | RequestInterceptor<TInput, TOutput, TContext>;


/**
 * Application interceptor service.
 */
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
