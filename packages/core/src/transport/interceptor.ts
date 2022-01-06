import { Observable } from 'rxjs';
import { Context } from './context';

/**
 * Transport handler.
 */
export interface TransportHandler<T> {
    /**
     * route handler.
     */
    handle(): Observable<T>;
}

/**
 * Transport interceptor.
 */
export interface TransportInterceptor<T = any, Re = any> {
    /**
     * the method to implemet interceptor.
     * @param context context.
     * @param next route handler.
     */
    intercept(context: Context, next: TransportHandler<T>): Observable<Re>;
}
