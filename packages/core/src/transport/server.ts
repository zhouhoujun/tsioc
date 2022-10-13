import { Abstract, ArgumentExecption, EMPTY, lang, Token } from '@tsdi/ioc';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { EndpointBackend } from './endpoint';
import { TransportEndpoint, TransportOpts } from './transport';
import { ServerEndpointContext } from './context';
import { MiddlewareBackend, MiddlewareLike, MiddlewareType } from './middleware';
import { Incoming, Outgoing } from './packet';
import { Receiver, Sender, TransportStrategy, TransportStrategyOpts } from './strategy';


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

    abstract proxy?: boolean;
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
            const { strategy, senderOpts, receiverOpts } = options.transport;
            if (!strategy) {
                throw new ArgumentExecption(lang.getClassName(this) + ' transport options strategy is missing.');
            }
            if (senderOpts) {
                if (senderOpts.sender) this.regTypeof(Sender, senderOpts.sender);
                if (senderOpts.interceptorsToken && senderOpts.interceptors) this.multiReg(senderOpts.interceptorsToken, senderOpts.interceptors ?? []);
            }
            if (receiverOpts) {
                if (receiverOpts.receiver) this.regTypeof(Receiver, receiverOpts.receiver);
                if (receiverOpts.interceptorsToken && receiverOpts.interceptors) this.multiReg(receiverOpts.interceptorsToken, receiverOpts.interceptors ?? []);
            }
            this.regTypeof(TransportStrategy, strategy);
        }

        const mToken = this._midlsToken = options.middlewaresToken!;
        if (!mToken) {
            throw new ArgumentExecption(lang.getClassName(this) + ' options middlewaresToken is missing.');
        }

        if (options.middlewares && options.middlewares.length) {
            const filter = this.context.get(MiddlewareFilter);
            const middlewares = filter? filter.filter(options.middlewares, options): options.middlewares;
            this.multiReg(mToken, middlewares);
        }
    }

    /**
     * get backend endpoint.
     */
    protected override getBackend(): EndpointBackend<TRequest, TResponse> {
        return new MiddlewareBackend(this.getMiddlewares())
    }

    protected getMiddlewares() {
        return this.context.injector.get(this._midlsToken, EMPTY)
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
