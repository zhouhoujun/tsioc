import { Observable } from 'rxjs';
import { ReadPacket, WritePacket } from './packet';
import { TransportHandler } from './handler';



/**
 * Transport interceptor.
 */
export interface TransportInterceptor<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket> {
    /**
     * the method to implemet interceptor.
     * @param req request.
     * @param next route handler.
     */
    intercept(req: TRequest, next: TransportHandler<TRequest, TResponse>): Observable<TResponse>;
}
