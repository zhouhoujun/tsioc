import { Abstract, InvocationContext } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { Startup } from '../startup';
import { InterceptorChain, Endpoint, EndpointBackend, MiddlewareBackend, MiddlewareInst, InterceptorInst, Interceptor } from './endpoint';
import { TransportContext, TransportContextFactory } from './context';
import { BasicMiddlewareSet, MiddlewareSet } from './middlware.set';

/**
 * abstract transport server.
 */
@Abstract()
@Runner('startup')
export abstract class TransportServer<TRequest, TResponse, Tx extends TransportContext = TransportContext> implements Startup, OnDispose {

    @Log()
    protected readonly logger!: Logger;

    protected _chain?: Endpoint<TRequest, TResponse>;
    private _middset?: MiddlewareSet<Tx>;
    private _ctxfac?: TransportContextFactory<TRequest, TResponse>;

    /**
     * server context.
     */
    abstract get context(): InvocationContext;
    /**
     * trasport context factory.
     */
    get contextFactory(): TransportContextFactory<TRequest, TResponse> {
        if (!this._ctxfac) {
            this._ctxfac = this.context.get(TransportContextFactory);
        }
        return this._ctxfac;
    }

    /**
     * get interceptors.
     */
    abstract getInterceptors(): Interceptor[];

    /**
     * middleware set.
     */
    get middlewares(): MiddlewareSet<Tx> {
        if (!this._middset) {
            this._middset = this.createMidderwareSet();
        }
        return this._middset;
    }

    /**
     * lazy create middleware set.
     */
    protected createMidderwareSet(): MiddlewareSet<Tx> {
        return this.context.get(MiddlewareSet) ?? new BasicMiddlewareSet();
    }
    /**
     * startup server.
     */
    abstract startup(): Promise<void>;
    /**
     * middlewares are executed on the transport request object before the
     * request is decoded.
     * @param middleware 
     */
    use(middleware: MiddlewareInst<Tx>, order?: number): this {
        this.middlewares.use(middleware, order);
        return this;
    }

    /**
     * get backend endpoint.
     */
    abstract getBackend(): EndpointBackend<TRequest, TResponse>;

    /**
     * transport endpoint chain.
     */
    chain(): Endpoint<TRequest, TResponse> {
        if (!this._chain) {
            this._chain = new InterceptorChain(new MiddlewareBackend(this.getBackend(), this.middlewares.getAll()), this.getInterceptors());
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
