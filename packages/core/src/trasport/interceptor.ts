import { Observable } from 'rxjs';
import { Context } from '../middlewares/context';

/**
 * Trasport handler.
 */
export interface TrasportHandler<T> {
    /**
     * route handler.
     */
    handle(): Observable<T>;
}

/**
 * Trasport interceptor.
 */
export interface TrasportInterceptor<T = any, Re = any> {
    /**
     * the method to implemet interceptor.
     * @param context context.
     * @param next route handler.
     */
    intercept(context: Context, next: TrasportHandler<T>): Observable<Re>;
}

