import { Abstract, ArgumentError, EMPTY, Injector, InvocationContext, isFunction, isNumber, lang, Token, Type } from '@tsdi/ioc';
import { Log, Logger } from '@tsdi/logs';
import { ExecptionChain } from '../execptions/chain';
import { ExecptionFilter } from '../execptions/filter';
import { Endpoint, EndpointBackend, InterceptorChain, InterceptorLike, InterceptorType } from './endpoint';

/**
 * transport endpoint options.
 */
 @Abstract()
 export abstract class TransportOptions<TRequest, TResponse> {
    /**
     * before intereptors
     */
    abstract befores?: InterceptorType<any, TRequest>[];
    /**
     * the mutil token to register before intereptors in the endpoint context.
     */
    abstract beforesToken?: Token<InterceptorLike<any, TRequest>[]>;
    /**
     * interceptors of endpoint.
     */
    abstract interceptors?: InterceptorType<TRequest, TResponse>[];
    /**
     * the mutil token to register intereptors in the endpoint context.
     */
    abstract interceptorsToken?: Token<InterceptorLike<TRequest, TResponse>[]>;
    /**
     * after intereptors
     */
    abstract afters?: InterceptorType<TResponse, any>[];
    /**
     * the mutil token to register after intereptors in the endpoint context.
     */
    abstract aftersToken?: Token<InterceptorLike<TResponse, any>[]>;

    /**
     * execption filters of server.
     */
    abstract execptions?: Type<ExecptionFilter>[];
    /**
     * the mutil token to register execption filters in the server context.
     */
    abstract execptionsToken?: Token<ExecptionFilter[]>;

}



/**
 * abstract transport endpoint.
 */
@Abstract()
export abstract class TransportEndpoint<TRequest = any, TResponse = any> {

    @Log()
    readonly logger!: Logger;

    protected _chain?: Endpoint<TRequest, TResponse>;

    private _befores?: InterceptorLike<any, TRequest>[];
    private _befToken?: Token<InterceptorLike<any, TRequest>[]>;

    private _afters?: InterceptorLike<TResponse, any>[];
    private _aftToken?: Token<InterceptorLike<TResponse, any>[]>;

    private _interceptors?: InterceptorLike<TRequest, TResponse>[];
    private _iptToken?: Token<InterceptorLike<TRequest, TResponse>[]>;

    private _exptChain?: ExecptionFilter;
    private _filters?: ExecptionFilter[];
    private _exptToken?: Token<ExecptionFilter[]>;

    constructor(readonly context: InvocationContext, options?: TransportOptions<TRequest, TResponse>) {
        this.initialize(this.initOption(options));
    }

    /**
     * initialize interceptors with options.
     * @param options 
     */
    protected initOption(options?: TransportOptions<TRequest, TResponse>): TransportOptions<TRequest, TResponse> {
        return options ?? {};
    }

    /**
     * initialize interceptors with options.
     * @param options 
     */
    protected initialize(options: TransportOptions<TRequest, TResponse>): void {
        const injector = this.context.injector;
        injector.inject({ provide: Logger, useFactory: () => this.logger });
        if (options.befores && options.befores.length) {
            const iToken = this._befToken = options.beforesToken;
            if (!iToken) {
                throw new ArgumentError(lang.getClassName(this) + ' options beforesToken is missing.');
            }
            this.regMulti(injector, iToken, options.befores);
        }

        if (options.interceptors && options.interceptors.length) {
            const iToken = this._iptToken = options.interceptorsToken;
            if (!iToken) {
                throw new ArgumentError(lang.getClassName(this) + ' options interceptorsToken is missing.');
            }
            this.regMulti(injector, iToken, options.interceptors);
        }

        if (options.afters && options.afters.length) {
            const iToken = this._aftToken = options.aftersToken;
            if (!iToken) {
                throw new ArgumentError(lang.getClassName(this) + ' options aftersToken is missing.');
            }
            this.regMulti(injector, iToken, options.afters);
        }

        if (options.execptions && options.execptions.length) {
            const eToken = this._exptToken = options.execptionsToken;
            if (!eToken) {
                throw new ArgumentError(lang.getClassName(this) + ' options aftersToken is missing.');
            }
            this.regMulti(injector, eToken, options.execptions);
        }

    }

    protected regMulti<T>(injector: Injector, provide: Token, types: (Type<T> | T)[]): void {
        const providers = types.map(m => {
            if (isFunction(m)) {
                return { provide, useClass: m, multi: true }
            } else {
                return { provide, useValue: m, multi: true }
            }
        });
        injector.inject(providers);
    }

    /**
     * endpoint before interceptors.
     */
    get befores(): InterceptorLike<any, TRequest>[] {
        if (!this._befores) {
            this._befores = this._befToken ? [...this.context.injector.get(this._befToken, EMPTY)] : []
        }
        return this._befores
    }

    /**
     * endpoint interceptors.
     */
    get interceptors(): InterceptorLike<TRequest, TResponse>[] {
        if (!this._interceptors) {
            this._interceptors = this._iptToken ? [...this.context.injector.get(this._iptToken, EMPTY)] : []
        }
        return this._interceptors
    }

    /**
     * endpoint after interceptors.
     */
    get afters(): InterceptorLike<TResponse, any>[] {
        if (!this._afters) {
            this._afters = this._aftToken ? [...this.context.injector.get(this._aftToken, EMPTY)] : []
        }
        return this._afters
    }

    /**
     * execption filters.
     */
    get filters(): ExecptionFilter[] {
        if (!this._filters) {
            this._filters = this._exptToken ? this.context.injector.get(this._exptToken, []) : [];
        }
        return this._filters;
    }


    /**
     * use intercept before request with interceptor.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    useBefore(interceptor: InterceptorLike<any, TRequest>, order?: number): this {
        if (isNumber(order)) {
            this.befores.splice(order, 0, interceptor)
        } else {
            this.befores.push(interceptor)
        }
        this._chain = null!;
        return this
    }

    /**
     * use interceptors.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    intercept(interceptor: InterceptorLike<TRequest, TResponse>, order?: number): this {
        if (isNumber(order)) {
            this.interceptors.splice(order, 0, interceptor)
        } else {
            this.interceptors.push(interceptor)
        }
        this._chain = null!;
        return this
    }

    /**
     * use intercept after serve response with interceptor.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    useAfter(interceptor: InterceptorLike<TResponse, any>, order?: number): this {
        if (isNumber(order)) {
            this.afters.splice(order, 0, interceptor)
        } else {
            this.afters.push(interceptor)
        }
        this._chain = null!;
        return this
    }

    /**
     * use execption filter.
     * @param filter 
     */
    useFilter(filter: ExecptionFilter): this {
        if (this.filters.indexOf(filter) < 0) {
            this.filters.push(filter);
        }
        this._exptChain = null!;
        return this;
    }

    /**
     * execption filter chain.
     */
    getExecptionFilter(): ExecptionFilter {
        if (!this._exptChain) {
            this._exptChain = new ExecptionChain(this.filters);
        }
        return this._exptChain;
    }

    /**
     * transport endpoint chain.
     */
    endpoint(): Endpoint<TRequest, TResponse> {
        if (!this._chain) {
            this._chain = new InterceptorChain(this.getBackend(), this.interceptors)
        }
        return this._chain
    }

    /**
     *  get backend endpoint. 
     */
    protected abstract getBackend(): EndpointBackend<TRequest, TResponse>;

}

