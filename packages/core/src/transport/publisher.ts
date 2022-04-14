import { Abstract, isFunction, tokenId } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { Startup } from '../startup';
import { Protocol, RequestBase, WritableResponse } from './packet';
import { Endpoint, Middleware, MiddlewareFn } from './endpoint';

/**
 * abstract transport server.
 */
@Abstract()
@Runner('startup')
export abstract class Publisher<TRequest extends RequestBase, TResponse extends WritableResponse> implements Startup, OnDispose {

    protected _befores: Middleware<TRequest, WritableResponse>[] = [];
    protected _afters: Middleware<TRequest, WritableResponse>[] = [];
    protected _finalizer: Middleware<TRequest, WritableResponse>[] = [];

    @Log()
    protected readonly logger!: Logger;
    /**
     * startup server.
     */
    abstract startup(): Promise<void>;
    /**
     * Before middlewares are executed on the transport request object before the
     * request is decoded.
     * @param middleware 
     */
    useBefore(middleware: Middleware<TRequest, TResponse> | MiddlewareFn<TRequest, TResponse>): this {
        this._befores.push(isFunction(middleware) ? { intercept: middleware } : middleware);
        return this;
    }
    /**
     * After middlewares are executed on the transport response writer after the
     * endpoint is invoked, but before anything is written to the client.
     * @param middleware 
     */
    useAfter(middleware: Middleware<TRequest, TResponse> | MiddlewareFn<TRequest, TResponse>): this {
        this._afters.push(isFunction(middleware) ? { intercept: middleware } : middleware);
        return this;
    }
    /**
     * Finalizer is executed at the end of every transport request.
     * By default, no finalizer is registered.
     * @param middleware 
     */
    useFinalizer(middleware: Middleware<TRequest, TResponse> | MiddlewareFn<TRequest, TResponse>): this {
        this._finalizer.push(isFunction(middleware) ? { intercept: middleware } : middleware);
        return this;
    }
    /**
     * transport handler.
     */
    abstract getEndpoint(): Endpoint<TRequest, TResponse>;

    /**
     * close server.
     */
    abstract close(): Promise<void>;
    /**
     * on dispose.
     */
    async onDispose(): Promise<void> {
        await this.close();
    }

}
