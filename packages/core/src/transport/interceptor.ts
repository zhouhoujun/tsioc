import { Observable } from 'rxjs';
import { TransportHandler } from './handler';



/**
 * Transport interceptor.
 */
export interface TransportInterceptor<TInput = any, TOutput = any> {
    /**
     * the method to implemet interceptor.
     * @param ctx context.
     * @param next route handler.
     */
    intercept(ctx: TInput, next: TransportHandler<TInput, TOutput>): Observable<TOutput>;
}
