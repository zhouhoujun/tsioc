import {
    Abstract, ArgumentExecption, Autorun, AutoWired, EMPTY, InvocationContext,
    isClass, isClassType, lang, ProviderType, Token, Type, TypeOf
} from '@tsdi/ioc';
import { Log, Logger } from '@tsdi/logs';
import { ExecptionChain } from '../execptions/chain';
import { ExecptionFilter } from '../execptions/filter';
import { Endpoint, EndpointBackend, InterceptorChain, InterceptorLike, InterceptorType } from './endpoint';



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
     * execption filters of server.
     */
    abstract execptions?: TypeOf<ExecptionFilter>[];
    /**
     * the mutil token to register execption filters in the server context.
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
    private _filterToken!: Token<ExecptionFilter[]>;
    private _bToken!: Token<EndpointBackend<TInput, TOutput>>;
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
    intercept(interceptor: InterceptorType<TInput, TOutput>, order?: number): this {
        this.multiOrder(this._iptToken, interceptor, order);
        this.resetEndpoint();
        return this
    }

    /**
     * use execption filter.
     * @param filter 
     */
    useFilter(filter: TypeOf<ExecptionFilter>, order?: number): this {
        if (!this._filterToken) {
            throw new ArgumentExecption(lang.getClassName(this) + ' options execptionsToken is missing.');
        }
        this.multiOrder(this._filterToken, filter, order);
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

        const eToken = this._filterToken = options.execptionsToken!;
        if (!eToken) {
            throw new ArgumentExecption(lang.getClassName(this) + ' options execptionsToken is missing.');
        }
        if (options.execptions && options.execptions.length) {
            this.multiReg(eToken, options.execptions);
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

