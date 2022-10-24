import { Abstract, ArgumentExecption, lang, StaticProvider, Token } from '@tsdi/ioc';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { TransportEndpoint, TransportOpts } from './transport';
import { ServerEndpointContext } from './context';
import { MiddlewareBackend, MiddlewareLike, MiddlewareType } from './middleware';
import { Incoming, Outgoing } from './packet';
import { TransportStrategy } from './strategy';


/**
 * server options.
 */
@Abstract()
export abstract class ServerOpts<TRequest extends Incoming = any, TResponse extends Outgoing = any> extends TransportOpts<TRequest, TResponse> {
    /**
     * transport options.
     */
    abstract transport?: StaticProvider<TransportStrategy>;
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

    private _strgy!: Token<TransportStrategy>;

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
        return options ?? {} as Opts;
    }

    /**
     * initialize middlewares, interceptors, execptions with options.
     * @param options 
     */
    protected override initContext(options: Opts) {
        super.initContext(options);
        if (options.transport) {
            this._strgy = this.regProvider(options.transport);
        } else {
            this._strgy = TransportStrategy;
        }

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

    protected getStrategy<T extends TransportStrategy>(): T {
        return this.context.injector.get(this._strgy) as T;
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
