import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { ReadPacket, Protocol, WritePacket } from './packet';


/**
 * Transport handler.
 */
@Abstract()
export abstract class TransportHandler<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket> {
    /**
     * transport handler.
     * @param req request input.
     */
    abstract handle(req: TRequest): Observable<TResponse>;
}

/**
 * A final {@link TransportHandler} which will dispatch the request via browser HTTP APIs to a backend.
 *
 * Interceptors sit between the `Client|Server` interface and the `TransportBackend`.
 *
 * When injected, `TransportBackend` dispatches requests directly to the backend, without going
 * through the interceptor chain.
 */
@Abstract()
export abstract class TransportBackend<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket> implements TransportHandler<TRequest, TResponse> {
    /**
     * transport Protocol type.
     */
    abstract get protocol(): Protocol;
    /**
     * transport handler.
     * @param req request input.
     */
    abstract handle(req: TRequest): Observable<TResponse>;
}

/**
 * event handler.
 */
@Abstract()
export abstract class EventHandler<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket> implements TransportHandler<TRequest, TResponse> {
    /**
     * transport event handler.
     * @param req request data.
     */
    abstract handle(req: TRequest): Observable<TResponse>;
}

/**
 * transport status.
 */
export type TransportStatus = 'Bad Request' | 'Forbidden' | 'Internal Server Error' | 'Not Acceptable' | 'Not Found' | 'Unauthorized' | 'Method Not Allowed' | number;

