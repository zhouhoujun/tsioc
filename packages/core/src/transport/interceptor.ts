import { Observable } from 'rxjs';
import { ReadPacket, WritePacket } from './packet';
import { TransportContext } from './context';
import { TransportHandler } from './handler';



/**
 * Transport interceptor.
 */
export interface TransportInterceptor<TRequest extends ReadPacket = ReadPacket, TRepsonse extends WritePacket = WritePacket> {
    /**
     * the method to implemet interceptor.
     * @param ctx invocation context with input.
     * @param next route handler.
     */
    intercept(ctx: TransportContext<TRequest, TRepsonse>, next: TransportHandler<TRequest, TRepsonse>): Observable<TRepsonse>;
}
