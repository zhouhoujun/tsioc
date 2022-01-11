import { InvocationContext } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportHandler } from './handler';



/**
 * Transport interceptor.
 */
export interface TransportInterceptor<TInput = any, TOutput = any> {
    /**
     * the method to implemet interceptor.
     * @param ctx invocation context with input.
     * @param next route handler.
     */
    intercept(ctx: InvocationContext<TInput>, next: TransportHandler<TInput, TOutput>): Observable<TOutput>;
}
