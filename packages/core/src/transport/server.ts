import { Abstract, ArgumentError, EMPTY, Injector, InvocationContext, isFunction, isNumber, ProviderType, Token, Type } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { of, Subscription } from 'rxjs';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { InterceptorChain, Endpoint, EndpointBackend, MiddlewareBackend, MiddlewareLike, InterceptorLike, MiddlewareType, InterceptorType, CustomEndpoint } from './endpoint';
import { ExecptionFilter } from '../execptions/filter';
import { TransportContext } from './context';
import { Serializer } from './serializer';
import { Deserializer } from './deserializer';

/**
 * server options.
 */
@Abstract()
export abstract class ServerOptions<TRequest, TResponse> {
    /**
     * before intereptors
     */
    abstract befores?: InterceptorType<any, TRequest>[];
    /**
     * the mutil token to register before intereptors in the server context.
     */
    abstract beforesToken?: Token<InterceptorLike<any, TRequest>[]>;
    /**
     * interceptors of server
     */
    abstract interceptors?: InterceptorType<TRequest, TResponse>[];
    /**
     * the mutil token to register intereptors in the server context.
     */
    abstract interceptorsToken?: Token<InterceptorLike<TRequest, TResponse>[]>;
    /**
     * after intereptors
     */
    abstract afters?: InterceptorType<TResponse, any>[];
    /**
     * the mutil token to register after intereptors in the server context.
     */
    abstract aftersToken?: Token<InterceptorLike<TResponse, any>[]>;

    /**
     * execption filters of server.
     */
    abstract execptions?: Type<ExecptionFilter>[];
    /**
     * the mutil token to register execption filters in the server context.
     */
    abstract execptionsToken?: Token<ExecptionFilter[]>;

    /**
     * middlewares of server.
     */
    abstract middlewares?: MiddlewareType[];
    /**
     * the mutil token to register middlewares in the server context.
     */
    abstract middlewaresToken?: Token<MiddlewareLike[]>;
}

/**
 * abstract transport server.
 */
@Abstract()
@Runner('start')
export abstract class TransportServer<TRequest = any, TResponse = any, Tx extends TransportContext = TransportContext> implements OnDispose {

    @Log()
    readonly logger!: Logger;

    private _chain?: Endpoint<TRequest, TResponse>;

    private _middles?: MiddlewareLike<Tx>[];
    private _midlsToken?: Token<MiddlewareLike[]>;

    private _befores?: InterceptorLike<any, TRequest>[];
    private _befToken?: Token<InterceptorLike<any, TRequest>[]>;

    private _afters?: InterceptorLike<TResponse, any>[];
    private _aftToken?: Token<InterceptorLike<TResponse, any>[]>;

    private _interceptors?: InterceptorLike<TRequest, TResponse>[];
    private _iptToken?: Token<InterceptorLike<TRequest, TResponse>[]>;

    private _exptToken?: Token<ExecptionFilter[]>;

    constructor(readonly context: InvocationContext, options?: ServerOptions<TRequest, TResponse>) {
        this.initialize(this.initOption(options));
    }

    /**
     * server middlewares.
     */
    get middlewares(): MiddlewareLike<Tx>[] {
        if (!this._middles) {
            this._middles = this._midlsToken ? [...this.context.injector.get(this._midlsToken, EMPTY)] : []
        }
        return this._middles
    }

    /**
     * server interceptors.
     */
    get befores(): InterceptorLike<any, TRequest>[] {
        if (!this._befores) {
            this._befores = this._befToken ? [...this.context.injector.get(this._befToken, EMPTY)] : []
        }
        return this._befores
    }

    /**
     * server execptions token.
     */
    getExecptionsToken(): Token<ExecptionFilter[]> {
        return this._exptToken!;
    }

    /**
     * server interceptors.
     */
    get interceptors(): InterceptorLike<TRequest, TResponse>[] {
        if (!this._interceptors) {
            this._interceptors = this._iptToken ? [...this.context.injector.get(this._iptToken, EMPTY)] : []
        }
        return this._interceptors
    }

    /**
     * server interceptors.
     */
    get afters(): InterceptorLike<TResponse, any>[] {
        if (!this._afters) {
            this._afters = this._aftToken ? [...this.context.injector.get(this._aftToken, EMPTY)] : []
        }
        return this._afters
    }

    /**
     * start server.
     */
    abstract start(): Promise<void>;

    /**
     * use intercept before request with interceptor.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    useBefore(interceptor: InterceptorLike<any, TRequest>, order?: number): this {
        if (isNumber(order)) {
            this.befores.splice(order, 0, interceptor)
        } else {
            this.befores.push(interceptor)
        }
        this._chain = null!;
        return this
    }

    /**
     * use intercept before request with interceptor.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    intercept(interceptor: InterceptorLike, order?: number): this {
        if (isNumber(order)) {
            this.interceptors.splice(order, 0, interceptor)
        } else {
            this.interceptors.push(interceptor)
        }
        this._chain = null!;
        return this
    }

    /**
     * use intercept after serve responed with interceptor.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    useAfter(interceptor: InterceptorLike<TResponse, any>, order?: number): this {
        if (isNumber(order)) {
            this.afters.splice(order, 0, interceptor)
        } else {
            this.afters.push(interceptor)
        }
        this._chain = null!;
        return this
    }

    /**
     * middlewares are executed on the transport request object before the
     * request is decoded.
     * @param middleware 
     */
    use(middleware: MiddlewareLike<Tx>, order?: number): this {
        if (isNumber(order)) {
            this.middlewares.splice(order, 0, middleware)
        } else {
            this.middlewares.push(middleware)
        }
        this._chain = null!;
        return this
    }

    /**
     * transport endpoint chain.
     */
    protected chain(): Endpoint<TRequest, TResponse> {
        if (!this._chain) {
            this._chain = new InterceptorChain(new MiddlewareBackend(this.getBackend(), this.middlewares), this.interceptors)
        }
        return this._chain
    }

    /**
     * init options.
     * @param options 
     * @returns 
     */
    protected initOption(options?: ServerOptions<TRequest, TResponse>): ServerOptions<TRequest, TResponse> {
        return options ?? {};
    }

    /**
     * initialize middlewares, interceptors, execptions with options.
     * @param options 
     */
    protected initialize(options: ServerOptions<TRequest, TResponse>) {
        const injector = this.context.injector;
        injector.setValue(TransportServer, this as any);
        injector.inject({ provide: Logger, useFactory: () => this.logger });
        if (options.middlewares && options.middlewares.length) {
            const mToken = this._midlsToken = options.middlewaresToken;
            if (!mToken) {
                throw new ArgumentError('server options middlewaresToken is missing.');
            }
            this.mutilInject(injector, mToken, options.middlewares);
        }

        if (options.befores && options.befores.length) {
            const iToken = this._befToken = options.beforesToken;
            if (!iToken) {
                throw new ArgumentError('server options beforesToken is missing.');
            }
            this.mutilInject(injector, iToken, options.befores);
        }

        if (options.interceptors && options.interceptors.length) {
            const iToken = this._iptToken = options.interceptorsToken;
            if (!iToken) {
                throw new ArgumentError('server options interceptorsToken is missing.');
            }
            this.mutilInject(injector, iToken, options.interceptors);
        }

        if (options.afters && options.afters.length) {
            const iToken = this._aftToken = options.aftersToken;
            if (!iToken) {
                throw new ArgumentError('server options aftersToken is missing.');
            }
            this.mutilInject(injector, iToken, options.afters);
        }

        // if (options.serializer) {
        //     injector.inject({ provide: Serializer, useClass: options.serializer });
        // }
        // if (options.deserializer) {
        //     injector.inject({ provide: Deserializer, useClass: options.deserializer });
        // }

        const eToken = this._exptToken = options.execptionsToken;
        if (options.execptions && options.execptions.length) {
            if (!eToken) {
                throw new ArgumentError('server options aftersToken is missing.');
            }
            this.mutilInject(injector, eToken, options.execptions);
        }
    }

    private mutilInject<T>(injector: Injector, provide: Token, types: (Type<T> | T)[]): void {
        const providers = types.map(m => {
            if (isFunction(m)) {
                return { provide, useClass: m, multi: true }
            } else {
                return { provide, useValue: m, multi: true }
            }
        });
        injector.inject(providers);
    }

    /**
     * get backend endpoint.
     */
    protected getBackend(): EndpointBackend<TRequest, TResponse> {
        return new CustomEndpoint<TRequest, TResponse>((req, ctx) => of((ctx as TransportContext).response))
    }
    /**
     * lazy create context.
     */
    protected abstract createContext(request: TRequest, response: TResponse): Tx;

    /**
     * request handler.
     * @param request 
     * @param response 
     */
    protected requestHandler(request: TRequest, response: TResponse) {
        const ctx = this.createContext(request, response) as Tx;
        const cancel = this.chain().handle(request, ctx)
            .subscribe({
                complete: () => {
                    ctx.destroy()
                }
            });

        this.bindEvent(ctx, cancel)
    }

    protected abstract bindEvent(ctx: Tx, cancel: Subscription): void;


    /**
     * close server.
     */
    abstract close(): Promise<void>;
    /**
     * on dispose.
     */
    async onDispose(): Promise<void> {
        await this.close()
    }

}
