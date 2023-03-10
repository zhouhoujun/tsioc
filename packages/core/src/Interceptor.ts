import { InvocationContext } from '@tsdi/ioc';
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
