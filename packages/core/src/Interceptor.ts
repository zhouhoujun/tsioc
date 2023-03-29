import { getTokenOf, Token, ProvdierOf, TypeOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Handler } from './Handler';

/**
 * Interceptor is a chainable behavior modifier for `hanlders`.
 */
export interface Interceptor<TInput = any, TOutput = any> {
    /**
     * the method to implemet interceptor.
     * @param input  request input.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(input: TInput, next: Handler<TInput, TOutput>): Observable<TOutput>;
}

/**
 * interceptor service.
 */
export interface InterceptorService {
    /**
     * use interceptors
     * @param interceptors 
     * @param order 
     */
    useInterceptors(interceptors: ProvdierOf<Interceptor> | ProvdierOf<Interceptor>[], order?: number): this;
}


const INTERCEPTORS = 'INTERCEPTORS';
/**
 * get target filters token.
 * @param request 
 * @returns 
 */
export function getInterceptorsToken(type: TypeOf<any> | string, propertyKey?: string): Token<Interceptor[]> {
    return getTokenOf(type, INTERCEPTORS, propertyKey);
}

