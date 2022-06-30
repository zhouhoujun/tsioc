import { Abstract, ArgumentError, EMPTY, lang, InvocationContext, isNumber, Token } from '@tsdi/ioc';
import { of, Subscription } from 'rxjs';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { EndpointBackend, MiddlewareBackend, MiddlewareLike, MiddlewareType, CustomEndpoint } from './endpoint';
import { TransportContext } from './context';
import { TransportEndpoint, TransportOptions } from './transport';

/**
 * server options.
 */
@Abstract()
export abstract class ServerOptions<TRequest, TResponse> extends TransportOptions<TRequest, TResponse> {
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
export abstract class TransportServer<TRequest = any, TResponse = any, Tx extends TransportContext = TransportContext> extends TransportEndpoint<TRequest, TResponse> implements OnDispose {


    private _middles?: MiddlewareLike<Tx>[];
    private _midlsToken?: Token<MiddlewareLike[]>;

    constructor(context: InvocationContext, options?: ServerOptions<TRequest, TResponse>) {
        super(context, options);
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
     * start server.
     */
    abstract start(): Promise<void>;

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
     * init options.
     * @param options 
     * @returns 
     */
    protected override initOption(options?: ServerOptions<TRequest, TResponse>): ServerOptions<TRequest, TResponse> {
        return options ?? {};
    }

    /**
     * initialize middlewares, interceptors, execptions with options.
     * @param options 
     */
    protected override initialize(options: ServerOptions<TRequest, TResponse>) {
        const injector = this.context.injector;
        injector.setValue(TransportServer, this as any);
        super.initialize(options);
        
        if (options.middlewares && options.middlewares.length) {
            const mToken = this._midlsToken = options.middlewaresToken;
            if (!mToken) {
                throw new ArgumentError(lang.getClassName(this) + ' options middlewaresToken is missing.');
            }
            this.regMulti(injector, mToken, options.middlewares);
        }
    }

    /**
     * get backend endpoint.
     */
    protected override getBackend(): EndpointBackend<TRequest, TResponse> {
        return new MiddlewareBackend(new CustomEndpoint<TRequest, TResponse>((req, ctx) => of((ctx as TransportContext).response)), this.middlewares)
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
        const cancel = this.endpoint().handle(request, ctx)
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
