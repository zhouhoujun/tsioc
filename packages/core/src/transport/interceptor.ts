import { Observable } from 'rxjs';
import { TransportHandler } from './handler';



/**
 * Transport interceptor.
 */
export interface TransportInterceptor<TInput = any, TOutput = any> {
    /**
     * the method to implemet interceptor.
     * @param input input.
     * @param next route handler.
     */
    intercept(input: TInput, next: TransportHandler<TInput, TOutput>): Observable<TOutput>;
}
