import { Abstract, Injector, InvocationContext, InvocationOption, isArray } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Pattern } from './pattern';
import { Protocol } from './types';


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
     * transport Protocol type.
     */
    abstract get protocol(): Protocol;
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
    protocol?: Protocol;
    pattern: Pattern;
    data: T;
    event?: boolean;
}

/**
 * transport context.
 */
@Abstract()
export abstract class TransportContext<T = any> extends InvocationContext<T> {

    abstract get request(): T;
    abstract get protocol(): Protocol;
    abstract get pattern(): string;
    abstract get isEvent(): boolean;

    constructor(injector: Injector, options: TransportOption<T>) {
        super(injector, options);
        this.injector.setValue(TransportContext, this);
    }

    // static create<T>(injector: Injector, options: TransportOption<T>): TransportContext<T> {
    //     return new TransportContext(injector, options);
    // }
}

/**
 * transport context factory.
 */
@Abstract()
export abstract class TransportContextFactory {
    abstract create<T>(parent: Injector | InvocationContext, options: TransportOption<T>): TransportContext<T>;
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
