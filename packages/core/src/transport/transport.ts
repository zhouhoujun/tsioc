import { Abstract, ArgumentError, Autorun, AutoWired, EMPTY, InvocationContext, isClassType, lang, ProviderType, Token, Type, TypeOf } from '@tsdi/ioc';
import { Log, Logger } from '@tsdi/logs';
import { ExecptionChain } from '../execptions/chain';
import { ExecptionFilter } from '../execptions/filter';
import { Decoder, Encoder } from './coder';
import { Endpoint, EndpointBackend, InterceptorChain, InterceptorLike, InterceptorType } from './endpoint';


/**
 * transport endpoint options.
 */
@Abstract()
export abstract class TransportOpts<TRequest, TResponse> {
    /**
     * providers for transport.
     */
    abstract providers?: ProviderType[];
    /**
     * interceptors of endpoint.
     */
    abstract interceptors?: InterceptorType<TRequest, TResponse>[];
    /**
     * the mutil token to register intereptors in the endpoint context.
     */
    abstract interceptorsToken?: Token<InterceptorLike<TRequest, TResponse>[]>;
    /**
     * execption filters of server.
     */
    abstract execptions?: TypeOf<ExecptionFilter>[];
    /**
     * the mutil token to register execption filters in the server context.
     */
    abstract execptionsToken?: Token<ExecptionFilter[]>;
    /**
     * encoder input.
     */
    abstract encoder?: Type<Encoder>;
    /**
     * decoder input.
     */
    abstract decoder?: Type<Decoder>;

}


/**
 * abstract transport endpoint.
 */
@Abstract()
export abstract class TransportEndpoint<TRequest = any, TResponse = any, Opts extends TransportOpts<TRequest, TResponse> = any> {

    /**
     * logger of endpoint.
     */
    @Log()
    readonly logger!: Logger;
    /**
     * context of the endpoint.
     */
    @AutoWired()
    readonly context!: InvocationContext;

    private _chain?: Endpoint<TRequest, TResponse>;
    private _iptToken!: Token<InterceptorLike<TRequest, TResponse>[]>;
    private _filterToken!: Token<ExecptionFilter[]>;
    private _filter?: ExecptionFilter;
    private _opts: Opts;

    constructor(options?: Opts) {
        this._opts = this.initOption(options);
    }

    /**
     * auto run endpoint init after create new instance.
     */
    @Autorun()
    protected onEndpointInit() {
        const opts = this.getOptions();
        this.initContext(opts);
    }

    getOptions(): Opts {
        return this._opts;
    }

    /**
     * use interceptors.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    intercept(interceptor: InterceptorType<TRequest, TResponse>, order?: number): this {
        this.regMultiOrder(this._iptToken, interceptor, order);
        this.resetEndpoint();
        return this
    }

    /**
     * use execption filter.
     * @param filter 
     */
    useFilter(filter: TypeOf<ExecptionFilter>, order?: number): this {
        if (!this._filterToken) {
            throw new ArgumentError(lang.getClassName(this) + ' options execptionsToken is missing.');
        }
        this.regMultiOrder(this._filterToken, filter, order);
        this._filter = null!;
        return this;
    }

    /**
     * execption filter chain.
     */
    filter(): ExecptionFilter {
        if (!this._filter) {
            this._filter = new ExecptionChain(this.context.injector.get(this._filterToken, EMPTY));
        }
        return this._filter;
    }

    /**
     * transport endpoint chain.
     */
    endpoint(): Endpoint<TRequest, TResponse> {
        if (!this._chain) {
            this._chain = new InterceptorChain(this.getBackend(), this.context.injector.get(this._iptToken, EMPTY));
        }
        return this._chain
    }

    /**
     * reset endpoint.
     */
    protected resetEndpoint() {
        this._chain = null!;
    }

    /**
     *  get backend endpoint. 
     */
    protected abstract getBackend(): EndpointBackend<TRequest, TResponse>;

    /**
     * initialize options.
     * @param options 
     */
    protected abstract initOption(options?: Opts): Opts;

    /**
     * initialize context with options.
     * @param options 
     */
    protected initContext(options: Opts): void {
        const injector = this.context.injector;
        injector.inject({ provide: Logger, useFactory: () => this.logger });
        if (options.providers && options.providers.length) {
            injector.inject(options.providers);
        }
        const iToken = this._iptToken = options.interceptorsToken!;
        if (!iToken) {
            throw new ArgumentError(lang.getClassName(this) + ' options interceptorsToken is missing.');
        }
        if (options.interceptors && options.interceptors.length) {
            this.regMulti(iToken, options.interceptors);
        }

        const eToken = this._filterToken = options.execptionsToken!;
        if (!eToken) {
            throw new ArgumentError(lang.getClassName(this) + ' options execptionsToken is missing.');
        }
        if (options.execptions && options.execptions.length) {

            this.regMulti(eToken, options.execptions);
        }

        if (options.encoder) {
            injector.inject({ provide: Encoder, useClass: options.encoder });
        }
        if (options.decoder) {
            injector.inject({ provide: Decoder, useClass: options.decoder });
        }

    }

    protected regMulti<T>(provide: Token, types: (Type<T> | T)[]): void {
        const providers = types.map(m => {
            if (isClassType(m)) {
                return { provide, useClass: m, multi: true }
            } else {
                return { provide, useValue: m, multi: true }
            }
        });
        this.context.injector.inject(providers);
    }

    protected regMultiOrder<T>(provide: Token, target: Type<T> | T, multiOrder?: number) {
        if (isClassType(target)) {
            this.context.injector.inject({ provide, useClass: target, multi: true, multiOrder })
        } else {
            this.context.injector.inject({ provide, useValue: target, multi: true, multiOrder })
        }
    }

}

