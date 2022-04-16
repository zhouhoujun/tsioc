import { Abstract, isFunction, tokenId } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { Startup } from '../startup';
import { Protocol, RequestBase, ServerResponse } from './packet';
import { Endpoint, Middleware, MiddlewareFn } from './endpoint';

/**
 * abstract transport server.
 */
@Abstract()
@Runner('startup')
export abstract class TransportServer<TRequest extends RequestBase, TResponse extends ServerResponse> implements Startup, OnDispose {

    protected _befores: Middleware<TRequest, TResponse>[] = [];
    protected _afters: Middleware<TRequest, TResponse>[] = [];
    protected _finalizer: Middleware<TRequest, TResponse>[] = [];

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

/**
 * server option.
 */
export interface ServerOption extends Record<string, any> {
    url?: string;
    host?: string;
    port?: number;
    /**
     * transport protocol type.
     */
    protocol: Protocol;
}

export const SERVEROPTION = tokenId<ServerOption>('SERVEROPTION');

/**
 * server abstract factory.
 */
@Abstract()
export abstract class ServerFactory<TRequest extends RequestBase, TResponse extends ServerResponse> {
    /**
     * create by options.
     * @param options 
     */
    abstract create(options: ServerOption): TransportServer<TRequest, TResponse>;
}
