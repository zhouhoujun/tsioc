import { getClassName, getToken, InvocationContext, Token, TypeOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Endpoint } from './Endpoint';

/**
 * Interceptor is a chainable behavior modifier for `endpoints`.
 */
export interface Interceptor<TInput = any, TOutput = any> {
    /**
     * the method to implemet interceptor.
     * @param input  request input.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * @param context request context.
     * @returns An observable of the event stream.
     */
    intercept(input: TInput, next: Endpoint<TInput, TOutput>, context: InvocationContext): Observable<TOutput>;
}

/**
 * interceptor service.
 */
export interface InterceptorService {
    /**
     * use interceptor
     * @param interceptor 
     * @param order 
     */
    useInterceptor(interceptor: TypeOf<Interceptor> | TypeOf<Interceptor>[], order?: number): this;
}


/**
 * get target filters token.
 * @param request 
 * @returns 
 */
export function getInterceptorsToken(type: TypeOf<any>, propertyKey?: string): Token<Interceptor[]> {
    return getToken(getClassName(type), propertyKey ? `${propertyKey}_INTERCEPTORS` : 'INTERCEPTORS')
}

