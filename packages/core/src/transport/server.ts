import { Abstract, EMPTY, InvocationContext, isFunction, isNumber, ProviderType, Token, Type } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { Subscription } from 'rxjs';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { InterceptorChain, Endpoint, EndpointBackend, MiddlewareBackend, MiddlewareInst, InterceptorInst, MiddlewareType, InterceptorType } from './endpoint';
import { ExecptionFilter } from '../execptions/filter';
import { TransportContext } from './context';
import { Serializer } from './serializer';
import { Deserializer } from './deserializer';

/**
 * server options.
 */
export interface ServerOptions<TRequest, TResponse> {
    serializer?: Type<Serializer>;
    deserializer?: Type<Deserializer>;
    interceptors?: InterceptorType<TRequest, TResponse>[];
    execptions?: Type<ExecptionFilter>[];
    middlewares?: MiddlewareType[];
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
    private _middles?: MiddlewareInst<Tx>[];
    private _interceptors?: InterceptorInst<TRequest, TResponse>[];

    constructor(readonly context: InvocationContext, options?: ServerOptions<TRequest, TResponse>) {
        this.initialize(this.initOption(options));
    }

    /**
     * server middlewares.
     */
    get middlewares(): MiddlewareInst<Tx>[] {
        if (!this._middles) {
            this._middles = [...this.context.injector.get(this.getMiddlewaresToken(), EMPTY)]
        }
        return this._middles
    }

    /**
     * server interceptors.
     */
    get interceptors(): InterceptorInst<TRequest, TResponse>[] {
        if (!this._interceptors) {
            this._interceptors = [...this.context.injector.get(this.getInterceptorsToken(), EMPTY)]
        }
        return this._interceptors
    }

    /**
     * server execptions token.
     */
    abstract getExecptionsToken(): Token<ExecptionFilter[]>;
    /**
     * start server.
     */
    abstract start(): Promise<void>;

    /**
     * use interceptors.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    usetInterceptor(interceptor: InterceptorInst<TRequest, TResponse>, order?: number): this {
        if (isNumber(order)) {
            this.interceptors.splice(order, 0, interceptor)
        } else {
            this.interceptors.push(interceptor)
        }
        this._chain = null!;
        return this
    }
    /**
     * middlewares are executed on the transport request object before the
     * request is decoded.
     * @param middleware 
     */
    use(middleware: MiddlewareInst<Tx>, order?: number): this {
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
            const mToken = this.getMiddlewaresToken();
            const middlewares = options.middlewares.map(m => {
                if (isFunction(m)) {
                    return { provide: mToken, useClass: m, multi: true }
                } else {
                    return { provide: mToken, useValue: m, multi: true }
                }
            });
            injector.inject(middlewares);
        }

        if (options.interceptors && options.interceptors.length) {
            const iToken = this.getInterceptorsToken();
            const interceptors = options.interceptors.map(m => {
                if (isFunction(m)) {
                    return { provide: iToken, useClass: m, multi: true }
                } else {
                    return { provide: iToken, useValue: m, multi: true }
                }
            });
            injector.inject(interceptors);
        }

        if (options.serializer) {
            injector.inject({ provide: Serializer, useClass: options.serializer });
        }
        if (options.deserializer) {
            injector.inject({ provide: Deserializer, useClass: options.deserializer });
        }

        if (options.execptions && options.execptions.length) {
            const eToken = this.getExecptionsToken();
            const filters = options.execptions.map(e => ({ provide: eToken, useClass: e, multi: true }) as ProviderType);
            injector.inject(filters);
        }
    }
    /**
     * get mutil token of interceptors.
     */
    protected abstract getInterceptorsToken(): Token<InterceptorInst<TRequest, TResponse>[]>;
    /**
     * get mutil token of middlewares.
     */
    protected abstract getMiddlewaresToken(): Token<MiddlewareInst<Tx>[]>;

    /**
     * get backend endpoint.
     */
    protected abstract getBackend(): EndpointBackend<TRequest, TResponse>;
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
