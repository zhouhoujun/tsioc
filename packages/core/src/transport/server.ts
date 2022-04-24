import { Abstract, isFunction, tokenId } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { Startup } from '../startup';
import { InterceptorChain, Endpoint, EndpointBackend, Interceptor, InterceptorFn, Middleware, MiddlewareBackend, MiddlewareFn } from './endpoint';
import { TransportContextFactory } from './context';

/**
 * abstract transport server.
 */
@Abstract()
@Runner('startup')
export abstract class TransportServer<TRequest, TResponse> implements Startup, OnDispose {

    @Log()
    protected readonly logger!: Logger;

    protected _chain?: Endpoint<TRequest, TResponse>;
    private _interceptors: Interceptor<TRequest, TResponse>[] = [];
    private _middlewares: (Middleware | MiddlewareFn)[] = [];

    /**
     * context factory
     */
    abstract get contextFactory(): TransportContextFactory<TRequest, TResponse>;
    /**
     * startup server.
     */
    abstract startup(): Promise<void>;
    /**
     * intercept on the transport request.
     * @param interceptor 
     */
    intercept(interceptor: Interceptor<TRequest, TResponse> | InterceptorFn<TRequest, TResponse>): this {
        this._interceptors.push(isFunction(interceptor) ? { intercept: interceptor } : interceptor);
        return this;
    }
    /**
     * middlewares are executed on the transport request object before the
     * request is decoded.
     * @param middleware 
     */
    use(middleware: Middleware | MiddlewareFn): this {
        this._middlewares.push(middleware);
        return this;
    }

    /**
     * get backend endpoint.
     */
    abstract getBackend(): EndpointBackend<TRequest, TResponse>;
    /**
     * get interceptors.
     * @returns 
     */
    protected getInterceptors(): Interceptor<TRequest, TResponse>[] {
        return this._interceptors;
    }

    /**
     * transport endpoint chain.
     */
    chain(): Endpoint<TRequest, TResponse> {
        if (!this._chain) {
            this._chain = new InterceptorChain(new MiddlewareBackend(this.getBackend(), this._middlewares), this.getInterceptors());
        }
        return this._chain;
    }

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
}

export const SERVEROPTION = tokenId<ServerOption>('SERVEROPTION');

/**
 * server abstract factory.
 */
@Abstract()
export abstract class ServerFactory<TRequest, TResponse> {
    /**
     * create by options.
     * @param options 
     */
    abstract create(options: ServerOption): TransportServer<TRequest, TResponse>;
}
