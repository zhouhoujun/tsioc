import { Abstract, ArgumentError, EMPTY, lang, Token } from '@tsdi/ioc';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { Endpoint, EndpointBackend, MiddlewareBackend, MiddlewareLike, MiddlewareType } from './endpoint';
import { TransportEndpoint, TransportOpts } from './transport';
import { ConnectionContext } from './context';

/**
 * server options.
 */
@Abstract()
export abstract class ServerOpts<TRequest = any, TResponse = any> extends TransportOpts<TRequest, TResponse> {
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
 * binding request handler
 */
@Abstract()
export abstract class HandlerBinding<T extends ConnectionContext = ConnectionContext> {
    /**
     * binding handler for tansport context.
     * @param ctx 
     * @param endpoint 
     */
    abstract binding(ctx: T, handler: Endpoint): void;
}


/**
 * abstract server.
 */
@Abstract()
@Runner('start')
export abstract class Server<TRequest = any, TResponse = any, Tx extends ConnectionContext = ConnectionContext, Opts extends ServerOpts<TRequest, TResponse> = any> extends TransportEndpoint<TRequest, TResponse, Opts> implements OnDispose {

    private _midlsToken!: Token<MiddlewareLike[]>;

    abstract get proxy(): boolean;

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
        this.multiOrder(this._midlsToken, middleware, order);
        this.resetEndpoint();
        return this
    }


    /**
     * init options.
     * @param options 
     * @returns 
     */
    protected override initOption(options?: Opts): Opts {
        return options ?? {} as Opts;
    }

    /**
     * initialize middlewares, interceptors, execptions with options.
     * @param options 
     */
    protected override initContext(options: Opts) {
        const injector = this.context.injector;
        injector.setValue(Server, this);
        super.initContext(options);

        const mToken = this._midlsToken = options.middlewaresToken!;
        if (!mToken) {
            throw new ArgumentError(lang.getClassName(this) + ' options middlewaresToken is missing.');
        }

        if (options.middlewares && options.middlewares.length) {
            this.multiReg(mToken, options.middlewares);
        }
    }

    /**
     * get backend endpoint.
     */
    protected override getBackend(): EndpointBackend<TRequest, TResponse> {
        return new MiddlewareBackend(this.context.injector.get(this._midlsToken, EMPTY))
    }
    

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
