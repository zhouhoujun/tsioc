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

    private _chain?: Endpoint<TRequest, TResponse>;

    private _interceptors?: InterceptorLike<TRequest, TResponse>[];
    private _iptToken?: Token<InterceptorLike<TRequest, TResponse>[]>;

    private _exptChain?: ExecptionFilter;
    private _filters?: ExecptionFilter[];
    private _filterToken?: Token<ExecptionFilter[]>;

    constructor(readonly context: InvocationContext, options?: TransportOptions<TRequest, TResponse>) {
        this.initialize(this.initOption(options));
    }

    /**
     * initialize interceptors with options.
     * @param options 
     */
    protected abstract initOption(options?: TransportOptions<TRequest, TResponse>): TransportOptions<TRequest, TResponse>;

    /**
     * initialize interceptors with options.
     * @param options 
     */
    protected initialize(options: TransportOptions<TRequest, TResponse>): void {
        const injector = this.context.injector;
        injector.inject({ provide: Logger, useFactory: () => this.logger });

        if (options.interceptors && options.interceptors.length) {
            const iToken = this._iptToken = options.interceptorsToken;
            if (!iToken) {
                throw new ArgumentError(lang.getClassName(this) + ' options interceptorsToken is missing.');
            }
            this.regMulti(injector, iToken, options.interceptors);
        }

        if (options.execptions && options.execptions.length) {
            const eToken = this._filterToken = options.execptionsToken;
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
     * endpoint interceptors.
     */
    protected get interceptors(): InterceptorLike<TRequest, TResponse>[] {
        if (!this._interceptors) {
            this._interceptors = this._iptToken ? [...this.context.injector.get(this._iptToken, EMPTY)] : []
        }
        return this._interceptors
    }

    /**
     * execption filters.
     */
    protected get filters(): ExecptionFilter[] {
        if (!this._filters) {
            this._filters = this._filterToken ? this.context.injector.get(this._filterToken, []) : [];
        }
        return this._filters;
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
        this.resetEndpoint();
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

    protected resetEndpoint() {
        this._chain = null!;
    }

    /**
     *  get backend endpoint. 
     */
    protected abstract getBackend(): EndpointBackend<TRequest, TResponse>;

}

