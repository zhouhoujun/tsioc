import { Abstract, isFunction } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { Startup } from '../startup';
import { RequestBase, ServerResponse } from './packet';
import { InterceptorChain, Endpoint, EndpointBackend, Interceptor, InterceptorFn, Middleware, MiddlewareBackend, MiddlewareFn } from './endpoint';
import { TransportContextFactory } from './context';

/**
 * abstract transport server.
 */
@Abstract()
@Runner('startup')
export abstract class Publisher<TRequest extends RequestBase, TResponse extends ServerResponse> implements Startup, OnDispose {

    @Log()
    protected readonly logger!: Logger;

    protected _chain?: Endpoint<TRequest, TResponse>;
    private _interceptors: Interceptor<TRequest, TResponse>[] = [];
    private _middlewares: (Middleware | MiddlewareFn)[] = [];

    /**
     * startup server.
     */
    abstract startup(): Promise<void>;
    /**
     * context factory
     */
    abstract get contextFactory(): TransportContextFactory<TRequest, TResponse>;
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
            this._chain = new InterceptorChain(new MiddlewareBackend(this.contextFactory, this.getBackend(), this._middlewares), this.getInterceptors());
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
