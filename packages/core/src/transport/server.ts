import { Abstract, EMPTY, Inject, Injector, InvocationContext, isFunction, isNumber } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { Startup } from '../startup';
import { InterceptorChain, Endpoint, EndpointBackend, Interceptor, InterceptorFn, MiddlewareBackend, MiddlewareType } from './endpoint';
import { TransportContext, TransportContextFactory } from './context';

/**
 * abstract transport server.
 */
@Abstract()
@Runner('startup')
export abstract class TransportServer<TRequest, TResponse, Tx extends TransportContext = TransportContext> implements Startup, OnDispose {

    @Log()
    protected readonly logger!: Logger;

    protected _chain?: Endpoint<TRequest, TResponse>;
    protected _intpset?: InterceptorSet<TRequest, TResponse>;
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
     * Interceptor set.
     */
    get interceptors(): InterceptorSet<TRequest, TResponse> {
        if (!this._intpset) {
            this._intpset = this.createInterceptorSet();
        }
        return this._intpset;
    }

    /**
     * lazy create interceptor set.
     * @returns 
     */
    protected createInterceptorSet(): InterceptorSet<TRequest, TResponse> {
        return this.context.get(InterceptorSet) ?? new BasicInterceptorSet();;
    }


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
     * intercept on the transport request.
     * @param interceptor 
     * @param odrer 
     */
    intercept(interceptor: Interceptor<TRequest, TResponse> | InterceptorFn<TRequest, TResponse>, order?: number): this {
        this.interceptors.use(interceptor, order);
        return this;
    }
    /**
     * middlewares are executed on the transport request object before the
     * request is decoded.
     * @param middleware 
     */
    use(middleware: MiddlewareType<Tx>, order?: number): this {
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
            this._chain = new InterceptorChain(new MiddlewareBackend(this.getBackend(), this.middlewares.getAll()), this.interceptors.getAll());
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

@Abstract()
export abstract class InterceptorSet<TRequest, TResponse> {
    /**
     * use intercept on the transport request.
     * @param interceptor 
     * @param order 
     */
    abstract use(interceptor: Interceptor<TRequest, TResponse> | InterceptorFn<TRequest, TResponse>, order?: number): void;
    /**
     * get all interceptors.
     */
    abstract getAll(): Interceptor<TRequest, TResponse>[];
}

export class BasicInterceptorSet<TRequest, TResponse> extends InterceptorSet<TRequest, TResponse> {

    protected _intps: Interceptor<TRequest, TResponse>[];
    constructor() {
        super();
        this._intps = [];
    }

    use(interceptor: Interceptor<TRequest, TResponse> | InterceptorFn<TRequest, TResponse>, order?: number): void {
        const inptor = isFunction(interceptor) ? { intercept: interceptor } : interceptor;
        if (isNumber(order)) {
            this._intps.splice(order, 0, inptor);
        } else {
            this._intps.push(inptor);
        }
    }

    getAll(): Interceptor<TRequest, TResponse>[] {
        return this._intps;
    }

}

@Abstract()
export abstract class MiddlewareSet<T extends TransportContext = TransportContext> {
    /**
     * middlewares are executed on the transport request object before the
     * request is decoded.
     * @param middleware 
     */
    abstract use(middleware: MiddlewareType<T>, order?: number): void;
    /**
     * get all middlewares.
     */
    abstract getAll(): MiddlewareType<T>[];
}


export class BasicMiddlewareSet<T extends TransportContext> implements MiddlewareSet<T> {
    protected middlewares: MiddlewareType<T>[];
    constructor(middlewares?: MiddlewareType<T>[]) {
        this.middlewares = [...middlewares ?? EMPTY];
    }

    use(middleware: MiddlewareType<T>, order?: number): void {
        if (isNumber(order)) {
            this.middlewares.splice(order, 0, middleware);
        } else {
            this.middlewares.push(middleware);
        }
    }

    getAll(): MiddlewareType<T>[] {
        return this.middlewares;
    }
}
