import { Abstract, InvocationContext, isArray } from '@tsdi/ioc';
import { Observable } from 'rxjs';

/**
 * Transport handler.
 */
@Abstract()
export abstract class TransportHandler<TInput = any, TOutput = any> {
    /**
     * transport handler.
     * @param ctx invocation context with input.
     */
    abstract handle(ctx: InvocationContext<TInput>): Observable<TOutput>;
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
export abstract class TransportBackend<TInput = any, TOutput = any> implements TransportHandler<TInput, TOutput> {
    /**
     * transport handler.
     * @param ctx invocation context with input.
     */
    abstract handle(ctx: InvocationContext<TInput>): Observable<TOutput>;
}

/**
 * event handler.
 */
@Abstract()
export abstract class EventHandler<TInput = any, TOutput = any> implements TransportHandler<TInput, TOutput> {
    /**
     * transport event handler.
     * @param ctx 
     */
    abstract handle(ctx: InvocationContext<TInput>): Observable<TOutput>;
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
