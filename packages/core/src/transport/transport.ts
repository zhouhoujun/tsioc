import {
    Abstract, ArgumentExecption, Autorun, AutoWired, EMPTY, InvocationContext,
    isClass, isClassType, isFunction, lang, ProviderType, StaticProvider, Token, Type, TypeOf
} from '@tsdi/ioc';
import { Log, Logger } from '@tsdi/logs';
import { Endpoint, EndpointBackend, InterceptorChain, InterceptorLike, InterceptorType } from './endpoint';
import { ExecptionBackend, ExecptionFilter, ExecptionHandlerBackend } from './execption.filter';
import { FilterChain, EndpointFilter } from './filter';
import { StatusFactory } from './status';

/**
 * transport endpoint options.
 */
@Abstract()
export abstract class TransportOpts<TInput, TOutput> {
    /**
     * providers for transport.
     */
    abstract providers?: ProviderType[];
    /**
     * status factory.
     */
    abstract statusFactory?: StaticProvider<StatusFactory>;
    /**
     * interceptors or filter of endpoint.
     */
    abstract interceptors?: InterceptorType<TInput, TOutput>[];
    /**
     * the mutil token to register intereptors in the endpoint context.
     */
    abstract interceptorsToken?: Token<InterceptorLike<TInput, TOutput>[]>;
    /**
     * backend.
     */
    abstract backend?: StaticProvider<EndpointBackend>;
    /**
     * execption filters.
     */
    abstract filters?: TypeOf<ExecptionFilter>[];
    /**
     * the mutil token to register execption filters in the context.
     */
    abstract filtersToken?: Token<ExecptionFilter[]>;
    /**
     * execption filters backend.
     */
    abstract filtersBackend?: StaticProvider<ExecptionBackend>;
    /**
     * endpoint timeout.
     */
    abstract timeout?: number;

}


/**
 * abstract transport endpoint.
 */
@Abstract()
export abstract class TransportEndpoint<
    TInput = any,
    TOutput = any,
    Opts extends TransportOpts<TInput, TOutput> = TransportOpts<TInput, TOutput>> {

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

    private _chain?: Endpoint<TInput, TOutput>;
    private _iptToken!: Token<InterceptorLike<TInput, TOutput>[]>;
    private _bToken!: Token<EndpointBackend<TInput, TOutput>>;
    private _expFToken!: Token<ExecptionFilter[]>;
    private _expFilter?: ExecptionBackend;
    private _expBToken!: Token<ExecptionBackend>;
    private _opts: Opts;
    private _statfToken!: Token<StatusFactory>;

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
     * status factory.
     * @returns 
     */
    statusFactory(): StatusFactory {
        return this.context.injector.get(this._statfToken);
    }


    /**
     * use interceptors.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    intercept(interceptor: InterceptorType<TInput, TOutput>, order?: number): this {
        this.multiOrder(this._iptToken, interceptor, order);
        this.resetEndpoint();
        return this
    }

    /**
     * use execption filter.
     * @param filter 
     */
    useExecptionFilter(filter: TypeOf<EndpointFilter>, order?: number): this {
        if (!this._expFToken) {
            throw new ArgumentExecption(lang.getClassName(this) + ' options execptionsToken is missing.');
        }
        this.multiOrder(this._expFToken, filter, order);
        this._expFilter = null!;
        return this;
    }

    /**
     * execption filter chain.
     */
    execptionfilter(): Endpoint {
        if (!this._expFilter) {
            this._expFilter = new FilterChain(this.getExecptionBackend(), this.context.injector.get(this._expFToken, EMPTY));
        }
        return this._expFilter;
    }

    /**
     * transport endpoint chain.
     */
    get endpoint(): Endpoint<TInput, TOutput> {
        if (!this._chain) {
            this._chain = this.buildEndpoint();
        }
        return this._chain
    }

    protected buildEndpoint(): Endpoint<TInput, TOutput> {
        return new InterceptorChain(this.getBackend(), this.context.injector.get(this._iptToken, EMPTY));
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
    protected getBackend(): EndpointBackend<TInput, TOutput> {
        return this.context.get(this._bToken);
    }

    /**
     *  get backend endpoint. 
     */
    protected getExecptionBackend(): ExecptionBackend {
        return this.context.get(this._expBToken);
    }

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
            throw new ArgumentExecption(lang.getClassName(this) + ' options interceptorsToken is missing.');
        }
        if (options.interceptors && options.interceptors.length) {
            this.multiReg(iToken, options.interceptors);
        }

        if (!options.backend) {
            throw new ArgumentExecption(lang.getClassName(this) + ' options backend is missing.');
        }
        this._bToken = this.regProvider(options.backend);

        if (!options.statusFactory) {
            throw new ArgumentExecption(lang.getClassName(this) + ' options statusFactory is missing.');
        }
        this._statfToken = this.regProvider(options.statusFactory);


        const expfToken = this._expFToken = options.filtersToken!;
        if (!expfToken) {
            throw new ArgumentExecption(lang.getClassName(this) + ' options filtersToken is missing.');
        }
        if (options.filters && options.filters.length) {
            this.multiReg(expfToken, options.filters);
        }
        if (!options.filtersBackend) {
            options.filtersBackend = ExecptionHandlerBackend;
        }
        this._expBToken = this.regProvider(options.filtersBackend);

    }

    protected multiReg<T>(provide: Token, types: (Type<T> | T)[]): void {
        const providers = types.map(m => {
            if (isClassType(m)) {
                return isClass(m) ? { provide, useClass: m, multi: true } : { provide, useExisting: m, multi: true };
            } else {
                return { provide, useValue: m, multi: true }
            }
        });
        this.context.injector.inject(providers);
    }

    protected multiOrder<T>(provide: Token, target: Type<T> | T, multiOrder?: number) {
        if (isClassType(target)) {
            const pdr = isClass(target) ? { provide, useClass: target, multi: true, multiOrder } : { provide, useExisting: target, multi: true, multiOrder }
            this.context.injector.inject(pdr)
        } else {
            this.context.injector.inject({ provide, useValue: target, multi: true, multiOrder })
        }
    }

    protected regProvider(provider: StaticProvider): Token {
        const prvoide = isFunction(provider) ? provider : provider.provide;
        if (!isFunction(provider) || isClass(provider)) this.context.injector.register(provider as Type);
        return prvoide;
    }
}

