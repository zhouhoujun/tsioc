import { Abstract, Inject, Injector, isFunction } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { Startup } from '../startup';
import { InterceptorChain, Endpoint, EndpointBackend, Interceptor, InterceptorFn, Middleware, MiddlewareBackend, MiddlewareFn, MiddlewareType } from './endpoint';
import { TransportContext, TransportContextFactory } from './context';

/**
 * abstract transport server.
 */
@Abstract()
@Runner('startup')
export abstract class TransportServer<TRequest, TResponse, Tx extends TransportContext = TransportContext> implements Startup, OnDispose {

    @Log()
    protected readonly logger!: Logger;
    @Inject()
    protected injector!: Injector;

    protected _chain?: Endpoint<TRequest, TResponse>;
    private _interceptors: Interceptor<TRequest, TResponse>[] = [];
    private _middlewares: MiddlewareType<Tx>[] = [];

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
    use(middleware: MiddlewareType<Tx>): this {
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

    protected getMiddlewares(): MiddlewareType<Tx>[] {
        return this._middlewares;
    }

    /**
     * transport endpoint chain.
     */
    chain(): Endpoint<TRequest, TResponse> {
        if (!this._chain) {
            this._chain = new InterceptorChain(new MiddlewareBackend(this.getBackend(), this.getMiddlewares()), this.getInterceptors());
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
