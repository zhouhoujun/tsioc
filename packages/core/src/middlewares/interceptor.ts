import { Observable } from 'rxjs';
import { Context } from './context';

/**
 * request handler.
 */
export interface RequestHandler<T> {
    /**
     * route handler.
     */
    handle(): Observable<T>;
}

/**
 * Request interceptor.
 */
export interface RequestInterceptor<T = any, Re = any> {
    /**
     * the method to implemet interceptor.
     * @param context context.
     * @param next route handler.
     */
    intercept(context: Context, next: RequestHandler<T>): Observable<Re>;
}
