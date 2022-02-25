import { Observable } from 'rxjs';
import { TransportRequest, TransportResponse } from './packet';
import { TransportHandler } from './handler';



/**
 * Transport interceptor.
 */
export interface TransportInterceptor<TRequest extends TransportRequest = TransportRequest, TResponse extends TransportResponse = TransportResponse> {
    /**
     * the method to implemet interceptor.
     * @param req request.
     * @param next route handler.
     */
    intercept(req: TRequest, next: TransportHandler<TRequest, TResponse>): Observable<TResponse>;
}


export class InterceptorHandler<TRequest extends TransportRequest = TransportRequest, TResponse extends TransportResponse = TransportResponse> implements TransportHandler {
    constructor(private next: TransportHandler<TRequest, TResponse>, private interceptor: TransportInterceptor<TRequest, TResponse>) { }

    handle(req: TRequest): Observable<TResponse> {
        return this.interceptor.intercept(req, this.next);
    }
}