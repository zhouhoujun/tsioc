import { Abstract, ArgumentExecption, EMPTY, EMPTY_OBJ, lang, ProviderType, StaticProvider, Token } from '@tsdi/ioc';
import { Runner } from '../metadata';
import { OnDispose } from '../lifecycle';
import { TransportEndpoint, TransportOpts } from './transport';
import { ServerEndpointContext } from './context';
import { MiddlewareBackend, MiddlewareLike, MiddlewareType } from './middleware';
import { Incoming, Outgoing } from './packet';


/**
 * server options.
 */
@Abstract()
export abstract class ServerOpts<TRequest extends Incoming = any, TResponse extends Outgoing = any> extends TransportOpts<TRequest, TResponse> {
    /**
     * middlewares of server.
     */
    abstract middlewares?: MiddlewareType[];
    /**
     * the mutil token to register middlewares in the server context.
     */
    abstract middlewaresToken?: Token<MiddlewareLike[]>;

    abstract listenOpts?: any;

    abstract proxy?: boolean;
}

/**
 * get middleware backend.
 * @param deps 
 * @returns 
 */
export function getMiddlewareBackend(...deps: Token[]): StaticProvider<MiddlewareBackend> {
    return {
        provide: MiddlewareBackend,
        useFactory(middlewares: MiddlewareLike[]) {
            return new MiddlewareBackend(middlewares)
        },
        deps
    }
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

    get proxy(): boolean {
        return this.getOptions().proxy === true;
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
        const defOpts = this.getDefaultOptions();
        const providers = options && options.providers ? [...this.defaultProviders(), ...options.providers] : this.defaultProviders();
        const opts = { ...defOpts, ...options, providers };
        if (!opts.backend && opts.middlewaresToken) {
            opts.backend = getMiddlewareBackend(opts.middlewaresToken);
        }
        return opts as Opts;
    }

    protected getDefaultOptions(): Opts {
        return EMPTY_OBJ as Opts;
    }

    protected defaultProviders(): ProviderType[] {
        return EMPTY;
    }

    /**
     * initialize middlewares, interceptors, execptions with options.
     * @param options 
     */
    protected override initContext(options: Opts) {
        super.initContext(options);

        const mToken = this._midlsToken = options.middlewaresToken!;
        if (!mToken) {
            throw new ArgumentExecption(lang.getClassName(this) + ' options middlewaresToken is missing.');
        }

        if (options.middlewares && options.middlewares.length) {
            const filter = this.context.get(MiddlewareFilter);
            const middlewares = filter ? filter.filter(options.middlewares, options) : options.middlewares;
            this.multiReg(mToken, middlewares);
        }
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

@Abstract()
export abstract class MiddlewareFilter {
    abstract filter(middlewares: MiddlewareType[], opts: Record<string, any>): MiddlewareType[];
}
