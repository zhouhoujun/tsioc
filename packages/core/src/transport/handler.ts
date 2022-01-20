import { Abstract, isArray } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportContext } from './context';
import { ReadPacket, WritePacket } from './packet';
import { Protocol } from './types';


/**
 * Transport handler.
 */
@Abstract()
export abstract class TransportHandler<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket> {
    /**
     * transport handler.
     * @param ctx invocation context with input.
     */
    abstract handle(ctx: TransportContext<TRequest, TResponse>): Observable<TResponse>;
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
     * @param ctx invocation context with input.
     */
    abstract handle(ctx: TransportContext<TRequest, TResponse>): Observable<TResponse>;
}

/**
 * event handler.
 */
@Abstract()
export abstract class EventHandler<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket> implements TransportHandler<TRequest, TResponse> {
    /**
     * transport event handler.
     * @param ctx invocation context with input.
     */
    abstract handle(ctx: TransportContext<TRequest>): Observable<TResponse>;
}



/**
 * Transport error
 *
 * @export
 * @class TransportError
 * @extends {Error}
 */
export class TransportError extends Error {
    constructor(readonly status: string | number, message?: string | string[]) {
        super(isArray(message) ? message.join('\n') : message || '');
        Object.setPrototypeOf(this, TransportError.prototype);
        Error.captureStackTrace(this);
    }

    get statusCode() {
        return this.status;
    }

    toString() {
        return `Transport Error: ${this.status}, ${this.message}`;
    }

}
