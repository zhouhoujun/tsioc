import { Observable } from 'rxjs';
import { ReadPacket, WritePacket } from './packet';


/**
 * Transport handler.
 */
export interface TransportHandler<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket> {
    /**
     * transport handler.
     * @param req request input.
     */
    handle(req: TRequest): Observable<TResponse>;
}

/**
 * A final {@link TransportHandler} which will dispatch the request via browser HTTP APIs to a backend.
 *
 * Interceptors sit between the `Client|Server` interface and the `TransportBackend`.
 *
 * When injected, `TransportBackend` dispatches requests directly to the backend, without going
 * through the interceptor chain.
 */
export interface TransportBackend<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket> extends TransportHandler<TRequest, TResponse> {
    /**
     * transport handler.
     * @param req request input.
     */
    handle(req: TRequest): Observable<TResponse>;
}


/**
 * transport status.
 */
export type TransportStatus = 'Bad Request' | 'Forbidden' | 'Internal Server Error' | 'Not Acceptable' | 'Not Found' | 'Unauthorized' | 'Method Not Allowed' | number;

