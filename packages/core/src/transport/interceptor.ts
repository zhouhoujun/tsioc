import { Observable } from 'rxjs';
import { TransportHandler } from './handler';



/**
 * Transport interceptor.
 */
export interface TransportInterceptor<TRequest, TResponse> {
    /**
     * the method to implemet interceptor.
     * @param req request.
     * @param next route handler.
     */
    intercept(req: TRequest, next: TransportHandler<TRequest, TResponse>): Observable<TResponse>;
}

/**
 * Interceptor Handler.
 */
export class InterceptorHandler<TRequest, TResponse> implements TransportHandler<TRequest, TResponse> {
    constructor(private next: TransportHandler<TRequest, TResponse>, private interceptor: TransportInterceptor<TRequest, TResponse>) { }

    handle(req: TRequest): Observable<TResponse> {
        return this.interceptor.intercept(req, this.next);
    }
}
