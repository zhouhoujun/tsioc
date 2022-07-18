import { Abstract, ArgumentError, EMPTY, lang, InvocationContext, Token } from '@tsdi/ioc';
import { Subscription } from 'rxjs';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { EndpointBackend, MiddlewareBackend, MiddlewareLike, MiddlewareType } from './endpoint';
import { TransportEndpoint, TransportOpts } from './transport';
import { TransportContext } from './context';

/**
 * server options.
 */
@Abstract()
export abstract class ServerOpts<TRequest, TResponse> extends TransportOpts<TRequest, TResponse> {
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

    private _midlsToken!: Token<MiddlewareLike[]>;

    constructor(context: InvocationContext, options?: ServerOpts<TRequest, TResponse>) {
        super(context, options);
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
    use(middleware: MiddlewareType<Tx>, order?: number): this {
        this.regMultiOrder(this._midlsToken, middleware, order);
        this.resetEndpoint();
        return this
    }


    /**
     * init options.
     * @param options 
     * @returns 
     */
    protected override initOption(options?: ServerOpts<TRequest, TResponse>): ServerOpts<TRequest, TResponse> {
        return options ?? {};
    }

    /**
     * initialize middlewares, interceptors, execptions with options.
     * @param options 
     */
    protected override initialize(options: ServerOpts<TRequest, TResponse>) {
        const injector = this.context.injector;
        injector.setValue(TransportServer, this);
        super.initialize(options);

        const mToken = this._midlsToken = options.middlewaresToken!;
        if (!mToken) {
            throw new ArgumentError(lang.getClassName(this) + ' options middlewaresToken is missing.');
        }

        if (options.middlewares && options.middlewares.length) {
            this.regMulti(mToken, options.middlewares);
        }
    }

    /**
     * get backend endpoint.
     */
    protected override getBackend(): EndpointBackend<TRequest, TResponse> {
        return new MiddlewareBackend(this.context.injector.get(this._midlsToken, EMPTY))
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
