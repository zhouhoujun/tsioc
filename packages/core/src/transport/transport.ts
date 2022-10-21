import {
    Abstract, ArgumentExecption, Autorun, AutoWired, EMPTY, InvocationContext,
    isClass, isClassType, lang, ProviderType, Token, Type, TypeOf
} from '@tsdi/ioc';
import { Log, Logger } from '@tsdi/logs';
import { ExecptionChain } from '../execptions/chain';
import { ExecptionFilter } from '../execptions/filter';
import { Endpoint, EndpointBackend, InterceptorChain, InterceptorLike, InterceptorType } from './endpoint';
import { FilterChain, InterceptorFilter } from './filter';



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
     * interceptors of endpoint.
     */
    abstract interceptors?: InterceptorType<TInput, TOutput>[];
    /**
     * the mutil token to register intereptors in the endpoint context.
     */
    abstract interceptorsToken?: Token<InterceptorLike<TInput, TOutput>[]>;
    /**
     * backend.
     */
    abstract backend?: TypeOf<EndpointBackend<TInput, TOutput>>;
    /**
     * backend token.
     */
    abstract backendToken?: Token<EndpointBackend<TInput, TOutput>>;
    /**
     * intercpetor filters.
     */
    abstract filters?: TypeOf<InterceptorFilter>[];
    /**
     * the mutil token to register execption filters in the server context.
     */
    abstract filtersToken?: Token<InterceptorFilter[]>;
    /**
     * execption filters.
     */
    abstract execptions?: TypeOf<ExecptionFilter>[];
    /**
     * the mutil token to register execption filters in the context.
     */
    abstract execptionsToken?: Token<ExecptionFilter[]>;

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
    private _filterToken!: Token<InterceptorFilter[]>;
    private _filter!: EndpointBackend;
    private _expFilterToken!: Token<ExecptionFilter[]>;
    private _expFilter?: ExecptionFilter;
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
    intercept(interceptor: InterceptorType<TInput, TOutput>, order?: number): this {
        this.multiOrder(this._iptToken, interceptor, order);
        this.resetEndpoint();
        return this
    }

    /**
     * use respond filter.
     * @param filter 
     */
    useFilter(filter: TypeOf<InterceptorFilter>, order?: number): this {
        if (!this._filterToken) {
            throw new ArgumentExecption(lang.getClassName(this) + ' options respondsToken is missing.');
        }
        this.multiOrder(this._filterToken, filter, order);
        this._filter = null!;
        return this;
    }

    /**
     * respond filter chain.
     */
    filter(): EndpointBackend {
        if (!this._filter) {
            this._filter = new FilterChain(this.getBackend(), this.context.injector.get(this._filterToken, EMPTY));
        }
        return this._filter;
    }

    /**
     * use execption filter.
     * @param filter 
     */
    useExecptionFilter(filter: TypeOf<ExecptionFilter>, order?: number): this {
        if (!this._expFilterToken) {
            throw new ArgumentExecption(lang.getClassName(this) + ' options execptionsToken is missing.');
        }
        this.multiOrder(this._expFilterToken, filter, order);
        this._expFilter = null!;
        return this;
    }

    /**
     * execption filter chain.
     */
    execptionfilter(): ExecptionFilter {
        if (!this._expFilter) {
            this._expFilter = new ExecptionChain(this.context.injector.get(this._expFilterToken, EMPTY));
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
        return new InterceptorChain(this.filter(), this.context.injector.get(this._iptToken, EMPTY));
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

        const eToken = this._expFilterToken = options.execptionsToken!;
        if (!eToken) {
            throw new ArgumentExecption(lang.getClassName(this) + ' options execptionsToken is missing.');
        }
        if (options.execptions && options.execptions.length) {
            this.multiReg(eToken, options.execptions);
        }

        const rspdToken = this._filterToken = options.filtersToken!;
        if (!rspdToken) {
            throw new ArgumentExecption(lang.getClassName(this) + ' options filtersToken is missing.');
        }
        if (options.filters && options.filters.length) {
            this.multiReg(rspdToken, options.filters);
        }

        const bToken = this._bToken = options.backendToken ?? EndpointBackend;
        if (options.backend) {
            this.regTypeof(bToken, options.backend);
        }

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

    protected regTypeof<T>(provide: Token<T>, target: TypeOf<T>): void {
        if (isClassType(target)) {
            const pdr = isClass(target) ? { provide, useClass: target } : { provide, useExisting: target }
            this.context.injector.inject(pdr)
        } else {
            this.context.injector.inject({ provide, useValue: target })
        }
    }

}

