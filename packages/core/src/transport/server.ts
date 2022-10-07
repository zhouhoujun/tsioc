import { Abstract, ArgumentExecption, EMPTY, isFunction, lang, Token, TypeOf } from '@tsdi/ioc';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { EndpointBackend } from './endpoint';
import { TransportEndpoint, TransportOpts } from './transport';
import { ServerEndpointContext } from './context';
import { MiddlewareBackend, MiddlewareLike, MiddlewareType } from './middleware';
import { Incoming, Outgoing } from './packet';
import { TransportStrategy, TransportStrategyOpts } from './strategy';


/**
 * server options.
 */
@Abstract()
export abstract class ServerOpts<TRequest extends Incoming = any, TResponse extends Outgoing = any> extends TransportOpts<TRequest, TResponse> {
    /**
     * transport options.
     */
    abstract transport?: TransportStrategyOpts;
    /**
     * middlewares of server.
     */
    abstract middlewares?: MiddlewareType[];
    /**
     * the mutil token to register middlewares in the server context.
     */
    abstract middlewaresToken?: Token<MiddlewareLike[]>;

    abstract listenOpts?: any;
}

/**
 * abstract server.
 */
@Abstract()
@Runner('start')
export abstract class Server<
    TRequest extends Incoming = any,
    TResponse extends Outgoing = any,
    Tx extends ServerEndpointContext = ServerEndpointContext,
    Opts extends ServerOpts<TRequest, TResponse> = any>

    extends TransportEndpoint<TRequest, TResponse, Opts> implements OnDispose {

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
        super.initContext(options);
        if (options.transport) {
            this.context.setValue(TransportStrategyOpts, options.transport);
            const { strategy, interceptors, interceptorsToken } = options.transport;
            if (!strategy) {
                throw new ArgumentExecption(lang.getClassName(this) + ' transport options strategy is missing.');
            }
            if (interceptorsToken && interceptors) {
                this.multiReg(interceptorsToken, interceptors ?? []);
            }
            this.registerStrategy(strategy);
        }

        const mToken = this._midlsToken = options.middlewaresToken!;
        if (!mToken) {
            throw new ArgumentExecption(lang.getClassName(this) + ' options middlewaresToken is missing.');
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

    protected registerStrategy(strategy: TypeOf<TransportStrategy>) {
        this.context.injector.inject(isFunction(strategy) ? { provide: TransportStrategy, useExisting: strategy } : { provide: TransportStrategy, useValue: strategy });
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
        await this.context.destroy();
    }

}
