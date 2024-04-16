import {
    EMPTY, InjectFlags, Injector, InvokerOptions, ProvdierOf, StaticProvider, ClassType,
    Token, InvocationContext, createContext, isClassType, ArgumentExecption, isToken, isArray, toProvider

} from '@tsdi/ioc';
import { CanActivate, GUARDS_TOKEN, GuardsService } from '../guard';
import { INTERCEPTORS_TOKEN, Interceptor, InterceptorService } from '../Interceptor';
import { PipeService, PipeTransform } from '../pipes/pipe';
import { FILTERS_TOKEN, Filter, FilterService } from '../filters/filter';
import { GuardHandler } from './guards';
import { Backend } from '../Handler';



/**
 * Configable handler
 */
export class ConfigableHandler<
    TInput = any,
    TOutput = any,
    TOptions extends ConfigableHandlerOptions<TInput> = ConfigableHandlerOptions<TInput>,
    TContext = any> extends GuardHandler<TInput, TOutput, TContext> {


    protected options: TOptions;

    get injector() {
        return this.context.injector;
    }

    getOptions(): TOptions {
        return this.options;
    }

    constructor(
        protected context: InvocationContext,
        options: TOptions) {
        super(
            () => this.getBackend(),
            () => this.getInterceptors(),
            () => this.getGuards(),
            () => this.getFilters()
        );

        this.options = this.initOptions(options);
        if (this.options.backend && isClassType(this.options.backend) && !this.injector.has(this.options.backend, InjectFlags.Self)) {
            this.injector.inject(this.options.backend);
        }

        setHandlerOptions(this, this.options);
    }

    protected initOptions(options: TOptions): TOptions {
        return {
            interceptorsToken: INTERCEPTORS_TOKEN,
            guardsToken: GUARDS_TOKEN,
            filtersToken: FILTERS_TOKEN,
            ...options
        }
    }


    /**
     * use pipes
     * @param pipes 
     * @returns 
     */
    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this.injector.inject(pipes);
        return this;
    }

    /**
     * use interceptor for the handler.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    useInterceptors(interceptor: ProvdierOf<Interceptor<TInput, TOutput>> | ProvdierOf<Interceptor<TInput, TOutput>>[], order?: number): this {
        if (!this.options.interceptorsToken) return this;
        this.regMulti(this.options.interceptorsToken, interceptor, order);
        this.reset();
        return this;
    }


    /**
     * use guards for the handler.
     * @param guards 
     */
    useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number): this {
        if (!this.options.guardsToken) throw new ArgumentExecption('no guards token');
        this.regMulti(this.options.guardsToken, guards, order);
        this._cacheGuards = null;
        return this;
    }

    /**
     * use filters for the handler.
     * @param filter 
     * @param order 
     * @returns 
     */
    useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this {
        if (!this.options.filtersToken) throw new ArgumentExecption('no filters token');
        this.regMulti(this.options.filtersToken, filter, order);
        this.reset();
        return this;
    }

    /**
     * get registered backend of the handler.
     * @returns 
     */
    protected getBackend(): Backend<TInput, TOutput> {
        if (!this.options.backend) throw new ArgumentExecption('backend is empty.');
        return isToken(this.options.backend) ? this.injector.get(this.options.backend, this.context) : this.options.backend;
    }

    /**
     *  get filters. 
     */
    protected getFilters(): Filter<TInput, TOutput>[] {
        const filts = this.options.filtersToken ? this.injector.get(this.options.filtersToken, EMPTY) : EMPTY;
        return this.options.globalFiltersToken ? ([...this.injector.get(this.options.globalFiltersToken, EMPTY), ...filts]) : filts
    }

    /**
     * get registered iterceptors of the handler.
     * @returns 
     */
    protected getInterceptors(): Interceptor<TInput, TOutput>[] {
        const itps = this.injector.get(this.options.interceptorsToken!, EMPTY);
        return this.options.globalInterceptorsToken ? [...this.injector.get(this.options.globalInterceptorsToken, EMPTY), ...itps] : itps
    }

    private _cacheGuards?: CanActivate[] | null;
    /**
     * get registered guards of the handler.
     * @returns 
     */
    protected getGuards(): CanActivate[] {
        if (!this._cacheGuards) {
            const guards = this.options.guardsToken ? this.injector.get(this.options.guardsToken, null) : null;
            this._cacheGuards = this.options.globalGuardsToken ? [...this.injector.get(this.options.globalGuardsToken, EMPTY), ...(guards ?? EMPTY)] : guards
        }
        return this._cacheGuards || EMPTY;

    }

    protected regMulti<T>(token: Token, providers: ProvdierOf<T> | ProvdierOf<T>[], multiOrder?: number, isClass?: (type: Function) => boolean) {
        const multi = true;
        if (isArray(providers)) {
            this.injector.inject(providers.map((r, i) => toProvider(token, r, { multi, multiOrder, isClass })))
        } else {
            this.injector.inject(toProvider(token, providers, { multi, multiOrder, isClass }));
        }
    }

    protected clear() {
        super.clear();
        this._cacheGuards = null;
        if (this.options.interceptorsToken) this.injector.unregister(this.options.interceptorsToken);
        if (this.options.guardsToken) this.injector.unregister(this.options.guardsToken);
        if (this.options.filtersToken) this.injector.unregister(this.options.filtersToken);
        this.context = null!;
        this.options = null!;
    }
}



export interface BackendOptions<TInput = any> {
    backend?: Token<Backend<TInput>> | Backend<TInput>
}

export interface GuardHandlerOptions<TInput = any> extends BackendOptions<TInput> {
    /**
     * interceptors token.
     */
    interceptorsToken?: Token<Interceptor<TInput>[]>;
    /**
     * guards tokens.
     */
    guardsToken?: Token<CanActivate<TInput>[]>;
    /**
     * filter tokens.
     */
    filtersToken?: Token<Filter<TInput>[]>;
}


/**
 * handler service options.
 */
export interface HandlerOptions<TInput = any, TArg = any> extends InvokerOptions<any, TArg> {
    /**
     * An array of dependency-injection tokens used to look up `CanActivate()`
     * handlers, in order to determine if the current user is allowed to
     * activate the component. By default, any user can activate.
     */
    guards?: ProvdierOf<CanActivate<TInput>>[];
    /**
     * interceptors of bootstrap.
     */
    interceptors?: ProvdierOf<Interceptor<TInput>>[];
    /**
     * pipes for the bootstrap.
     */
    pipes?: StaticProvider<PipeTransform>[];
    /**
     * filters of bootstrap.
     */
    filters?: ProvdierOf<Filter<TInput>>[];
}

/**
 * handler token config options.
 */
export interface HandlerTokenConfigable<TInput = any> extends GuardHandlerOptions<TInput> {
    /**
     * global interceptors  token.
     */
    globalInterceptorsToken?: Token<Interceptor<TInput>[]>;

    /**
     * global filter tokens.
     */
    globalFiltersToken?: Token<Filter<TInput>[]>;

    /**
     * global guards tokens.
     */
    globalGuardsToken?: Token<CanActivate<TInput>[]>;
}

/**

/**
 * Configable handler options.
 */
export interface ConfigableHandlerOptions<TInput = any, TArg = any> extends HandlerOptions<TInput, TArg>, HandlerTokenConfigable<TInput>, BackendOptions<TInput> { 
    
    /**
     * execption handlers
     */
    execptionHandlers?: ClassType<any> | ClassType[];
}

/**
 * handler service.
 * 
 * 处理器服务
 */
export interface HandlerService extends FilterService, PipeService, InterceptorService, GuardsService {

}

/**
 * create configable hanlder with options
 */
export function createHandler<TInput, TOutput>(context: Injector | InvocationContext, options: ConfigableHandlerOptions<TInput>): ConfigableHandler<TInput, TOutput>;
/**
 * create configable hanlder with param options
 * @param context 
 * @param backend 
 * @param interceptorsToken 
 * @param guardsToken 
 * @param filtersToken 
 */
export function createHandler<TInput, TOutput>(context: Injector | InvocationContext,
    backend: Token<Backend<TInput, TOutput>> | Backend<TInput, TOutput>,
    interceptorsToken: Token<Interceptor<TInput, TOutput>[]>,
    guardsToken?: Token<CanActivate[]>,
    filtersToken?: Token<Filter<TInput, TOutput>[]>,
    globalInterceptorsToken?: Token<Interceptor<TInput, TOutput>[]>,
    globalGuardsToken?: Token<CanActivate<TInput>[]>,
    globalFiltersToken?: Token<Filter<TInput>[]>,
    /**
     * execption handlers
     */
    execptionHandlers?: ClassType<any> | ClassType[]
): ConfigableHandler<TInput, TOutput>;
export function createHandler<TInput, TOutput>(context: Injector | InvocationContext, arg: ConfigableHandlerOptions<TInput> | Token<Backend<TInput, TOutput>> | Backend<TInput, TOutput>,
    interceptorsToken?: Token<Interceptor<TInput, TOutput>[]>,
    guardsToken?: Token<CanActivate[]>,
    filtersToken?: Token<Filter<TInput, TOutput>[]>,
    globalInterceptorsToken?: Token<Interceptor<TInput, TOutput>[]>,
    globalGuardsToken?: Token<CanActivate<TInput>[]>,
    globalFiltersToken?: Token<Filter<TInput>[]>,
    execptionHandlers?: ClassType<any> | ClassType[]): ConfigableHandler<TInput, TOutput> {
    let options: ConfigableHandlerOptions<TInput>;
    if (interceptorsToken) {
        options = {
            backend: arg as (Token<Backend<TInput, TOutput>> | Backend<TInput, TOutput>),
            interceptorsToken,
            guardsToken,
            filtersToken,
            globalInterceptorsToken,
            globalGuardsToken,
            globalFiltersToken,
            execptionHandlers
        }
    } else {
        options = arg as ConfigableHandlerOptions<TInput>;
    }
    options = normalizeConfigableHandlerOptions(options);
    return new ConfigableHandler(createContext(context, options), options)
}

export function normalizeConfigableHandlerOptions<T extends ConfigableHandlerOptions>(options: T): T {
    if (options.execptionHandlers) {
        const handles = isArray(options.execptionHandlers) ? options.execptionHandlers : [options.execptionHandlers];
        if (!options.providers) {
            options.providers = [...handles];
        } else {
            options.providers.push(...handles)
        }
    }
    return options;
}


/**
 * set handler service with options.
 * @param service 
 * @param options 
 */
export function setHandlerOptions(service: HandlerService, options: HandlerOptions) {
    options.pipes?.length && service.usePipes(options.pipes);
    options.filters?.length && service.useFilters(options.filters);
    options.guards?.length && service.useGuards(options.guards);
    options.interceptors?.length && service.useInterceptors(options.interceptors);
}