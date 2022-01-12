import { Abstract, Injector, InvocationContext, InvocationOption, isArray } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportType } from './types';


/**
 * Transport handler.
 */
@Abstract()
export abstract class TransportHandler<TInput = any, TOutput = any> {
    /**
     * transport handler.
     * @param ctx invocation context with input.
     */
    abstract handle(ctx: TransportContext<TInput>): Observable<TOutput>;
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
     * transport type.
     */
    abstract get transport(): TransportType;
    /**
     * transport handler.
     * @param ctx invocation context with input.
     */
    abstract handle(ctx: TransportContext<TInput>): Observable<TOutput>;
}

/**
 * event handler.
 */
@Abstract()
export abstract class EventHandler<TInput = any, TOutput = any> implements TransportHandler<TInput, TOutput> {
    /**
     * transport event handler.
     * @param ctx invocation context with input.
     */
    abstract handle(ctx: TransportContext<TInput>): Observable<TOutput>;
}

/**
 * transport option.
 */
export interface TransportOption<T = any> extends InvocationOption {
    transport: TransportType;
    request: T;
}

/**
 * transport context.
 */
export class TransportContext<T = any> extends InvocationContext<T> {
    private _request: T;
    readonly transport: TransportType;
    constructor(injector: Injector, options: TransportOption<T>) {
        super(injector, options);
        this.transport = options.transport;
        this._request = options.request;
        this.injector.setValue(TransportContext, this);
    }

    get request(): T {
        return this._request;
    }

    static create<T>(injector: Injector, options: TransportOption<T>): TransportContext<T> {
        return new TransportContext(injector, options);
    }
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
