import {
    InjectFlags, Injector, ProvdierOf, StaticProvider, Type, promiseOf, Exception, toProvider, AbstractType, getType, Token, isType,
    ArgumentException, isToken, isArray, isFunction, composeInterceptors, chainFactory, some, Operator,
    createInjector
} from '@tsdi/ioc';
import { defer, mergeMap, Observable, Subject, takeUntil, throwError } from 'rxjs';
import { CanHandle, GuardLike, GUARDS_TOKEN } from '../guard';
import { INTERCEPTORS_TOKEN, ApplicationInterceptor, ApplicationInterceptorFn, ApplicationInterceptorLike, InterceptorResolver } from '../ApplicationInterceptor';
import { PipeTransform } from '../pipes/pipe';
import { FILTERS_TOKEN, Filter, FilterLike, FilterResolver, composeFilters } from '../filters/filter';
import { Backend, BackendFn } from '../ApplicationHandler';
import { AbstractConfigableHandler, ConfigableHandlerOptions, HandlerService } from './configable';



/**
 * Configable handlers
 */
export class ConfigableHandler<
    TInput = any,
    TOutput = any,
    TOptions extends ConfigableHandlerOptions<TInput> = ConfigableHandlerOptions<TInput>,
    TContext = any> implements AbstractConfigableHandler<TInput, TOutput, TOptions, TContext> {

    private destroy$ = new Subject<void>();
    private chain?: ApplicationInterceptorFn<TInput, TOutput, TContext> | null;
    private chains: Map<AbstractType | string, ApplicationInterceptorFn<TInput, TOutput, TContext> | null>;

    private _guards?: GuardLike[] | null;

    protected options: TOptions;

    get ready() {
        return this.injector.ready;
    }

    private _filterResolver?: FilterResolver;
    get filterResolver() {
        if (!this._filterResolver) {
            this._filterResolver = this.injector.get(FilterResolver);
        }
        return this._filterResolver;
    }

    private _interceptorResolver?: InterceptorResolver;
    get interceptorResolver() {
        if (!this._interceptorResolver) {
            this._interceptorResolver = this.injector.get(InterceptorResolver);
        }
        return this._interceptorResolver;
    }

    getOptions(): TOptions {
        return this.options;
    }


    constructor(
        readonly injector: Injector,
        options: TOptions) {

        this.options = this.initOptions(options);
        if (this.options.backend && isType(this.options.backend) && !this.injector.has(this.options.backend, InjectFlags.Self)) {
            Operator.inject(this.injector, this.options.backend);
        }

        setHandlerOptions(this, this.options);
        this.chains = new Map();
    }

    protected onReady(): Promise<void> {
        return this.ready;
    }

    protected initOptions(options: TOptions): TOptions {
        return {
            interceptorsToken: INTERCEPTORS_TOKEN,
            guardsToken: GUARDS_TOKEN,
            filtersToken: FILTERS_TOKEN,
            ...options
        }
    }

    handle(input: TInput, context?: TContext): Observable<TOutput> {
        return defer(async () => {

            if (this.onReady) await this.onReady();

            if (this._guards === undefined) {
                this._guards = this.getGuards() ?? null;
            }

            if (!this._guards || !this._guards.length) return true;

            if (!(await some(
                this._guards!.map(gd => () => promiseOf(isFunction(gd) ? gd(input, context) : gd.canHandle(input, context))),
                vaild => vaild === false))) {
                return false;
            }
            return true;
        }).pipe(
            mergeMap(r => {
                if (r === true) {
                    return this.run(input, context);
                }
                return throwError(() => this.forbiddenError())
            }),
            takeUntil(this.destroy$)
        )
    }


    /**
     * use pipes
     * @param pipes 
     * @returns 
     */
    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        Operator.inject(this.injector, pipes);
        return this;
    }

    /**
     * use interceptor for the handler.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    useInterceptors(interceptor: ProvdierOf<ApplicationInterceptorLike<TInput, TOutput>> | ProvdierOf<ApplicationInterceptorLike<TInput, TOutput>>[], order?: number): this {
        if (!this.options.interceptorsToken) return this;
        this.regMulti(this.options.interceptorsToken, interceptor, order);
        this.reset();
        return this;
    }


    /**
     * use guards for the handler.
     * @param guards 
     */
    useGuards(guards: ProvdierOf<GuardLike> | ProvdierOf<GuardLike>[], order?: number): this {
        if (!this.options.guardsToken) throw new ArgumentException('no guards token');
        this.regMulti(this.options.guardsToken, guards, order);
        this.reset();
        return this;
    }

    /**
     * use filters for the handler.
     * @param filter 
     * @param order 
     * @returns 
     */
    useFilters(filter: ProvdierOf<FilterLike> | ProvdierOf<FilterLike>[], order?: number): this {
        if (!this.options.filtersToken) throw new ArgumentException('no filters token');
        this.regMulti(this.options.filtersToken, filter, order);
        this.reset();
        return this;
    }
    private _destroyed = false;
    onDestroy(): void {
        if (this._destroyed) return;
        this._destroyed = true;
        this.destroy$.next();
        this.destroy$.complete();
        this.clear();
    }

    protected run(input: TInput, context?: TContext) {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return this.getChain(input)(input, this.getBackend(), context);
    }

    /**
     * get input chain, register by `@Filterable` or `@Interceptable`
     * @param input 
     * @returns 
     */
    protected getChain(input: TInput): ApplicationInterceptorFn<TInput, TOutput> {
        return this.options.enableTypeChain ? this.getChainOf(getType(input)) : this.chain!;
    }

    /**
     * get chain of type, register by `@Filterable` or `@Interceptable`
     * @param type 
     * @returns 
     */
    protected getChainOf(type: AbstractType | string): ApplicationInterceptorFn<TInput, TOutput> {
        let chain = this.chains.get(type);
        if (chain === undefined) {
            chain = this.composeTypeChain(type);
            this.chains.set(type, chain);
        }

        return chain ?? this.chain!;
    }

    /**
     * componse chain of type, register by `@Filterable` or `@Interceptable`
     * @param type 
     * @returns 
     */
    protected composeTypeChain(type: AbstractType | string): ApplicationInterceptorFn<TInput, TOutput> | null {
        const filters = this.filterResolver.resolve(type);
        const inteceptors = this.interceptorResolver.resolve(type);
        if (!(filters.length || inteceptors.length)) return null;

        const fns = [];
        if (filters?.length) fns.push(composeFilters(filters));
        if (inteceptors?.length) fns.push(...inteceptors);

        return chainFactory(composeInterceptors(fns), this.chain!);
    }


    protected reset(): void {
        this.chain = null;
        this.chains?.clear();
        this._guards = undefined;
    }


    protected forbiddenError(): Exception {
        return new Exception('Forbidden')
    }


    /**
     * compose iterceptors and filters in chain.
     * @returns 
     */
    protected compose(): ApplicationInterceptorFn<TInput, TOutput> {
        const type = this.getHandlerType();
        const hdlFilters = this.filterResolver.resolve(type) ?? [];
        const hdlInteceptors = this.interceptorResolver.resolve(type) ?? [];

        const filters = this.getFilters();
        const inteceptors = this.getInterceptors();
        const fns = [];
        if (hdlFilters?.length) fns.push(composeFilters(hdlFilters));
        if (hdlInteceptors?.length) fns.push(...hdlInteceptors);
        if (filters?.length) fns.push(composeFilters(filters));
        if (inteceptors?.length) fns.push(...inteceptors);
        return composeInterceptors(fns);
    }

    protected getHandlerType(): AbstractType {
        return this.getOptions().scope ?? getType(this)
    }


    private backendFn?: BackendFn;
    /**
     * get registered backend of the handler.
     * @returns 
     */
    protected getBackend(): BackendFn {
        if (!this.options.backend) throw new ArgumentException('backend is Empty.');
        if (!this.backendFn) {
            const backend = isToken(this.options.backend) ? this.injector.get(this.options.backend, this.options.backend as any, InjectFlags.Default) : this.options.backend;
            this.backendFn = (isFunction(backend) ? backend : (req, ctx) => (backend as Backend).handle(req, ctx)) as BackendFn;
        }
        return this.backendFn;
    }

    /**
     *  get filters. 
     */
    protected getFilters(): FilterLike<TInput, TOutput>[] {
        return this.options.filtersToken ? this.injector.get(this.options.filtersToken, []) : [];
    }

    /**
     * get registered iterceptors of the handler.
     * @returns 
     */
    protected getInterceptors(): ApplicationInterceptorLike<TInput, TOutput>[] {
        return this.injector.get(this.options.interceptorsToken!, []);
    }


    /**
     * get registered guards of the handler.
     * @returns 
     */
    protected getGuards(): GuardLike[] | null {
        return this.options.guardsToken ? this.injector.get(this.options.guardsToken, null) : null;
    }

    protected regMulti<T>(token: Token, providers: ProvdierOf<T> | ProvdierOf<T>[], multiOrder?: number) {
        const multi = true;
        if (isArray(providers)) {
            Operator.inject(this.injector, providers.map((r, i) => toProvider(token, r, { multi, multiOrder })))
        } else {
            Operator.inject(this.injector, toProvider(token, providers, { multi, multiOrder }));
        }
    }

    protected clear() {
        if (this.options.interceptorsToken) Operator.unregister(this.injector, this.options.interceptorsToken);
        if (this.options.guardsToken) Operator.unregister(this.injector, this.options.guardsToken);
        if (this.options.filtersToken) Operator.unregister(this.injector, this.options.filtersToken);
        this.chain = undefined;
        this.backendFn = undefined;
        this.chains?.clear();
        this._filterResolver = undefined;
        this._interceptorResolver = undefined;
        // this.context = null!;
        this.options = null!;
    }
}




/**
 * create configable hanlder with options
 */
export function createHandler<TInput, TOutput>(context: Injector, options: ConfigableHandlerOptions<TInput>): ConfigableHandler<TInput, TOutput>;

/**
 * create configable hanlder with options
 */
export function createHandler<TClass extends ConfigableHandler, TInput>(context: Injector, options: ConfigableHandlerOptions<TInput>, type: TClass): TClass;
/**
 * create configable hanlder with param options
 * @param context 
 * @param backend 
 * @param interceptorsToken 
 * @param guardsToken 
 * @param filtersToken 
 */
export function createHandler<TInput, TOutput, TClass extends ConfigableHandler>(context: Injector,
    backend: Token<Backend<TInput, TOutput>> | Backend<TInput, TOutput>,
    interceptorsToken: Token<ApplicationInterceptor<TInput, TOutput>[]>,
    guardsToken?: Token<CanHandle[]>,
    filtersToken?: Token<Filter<TInput, TOutput>[]>,
    /**
     * execption handlers
     */
    execptionHandlers?: Type<any> | Type[] | null,
    enableTypeChain?: boolean
): ConfigableHandler<TInput, TOutput>;
export function createHandler<TInput, TOutput>(context: Injector, arg: ConfigableHandlerOptions<TInput> | Token<Backend<TInput, TOutput>> | Backend<TInput, TOutput>,
    interceptorsToken?: Token<ApplicationInterceptor<TInput, TOutput>[]> | Type<ConfigableHandler>,
    guardsToken?: Token<CanHandle[]>,
    filtersToken?: Token<Filter<TInput, TOutput>[]>,
    execptionHandlers?: Type<any> | Type[] | null,
    enableTypeChain?: boolean,
    type?: Type<ConfigableHandler>
): ConfigableHandler<TInput, TOutput> {
    let options: ConfigableHandlerOptions<TInput> & { classType?: Type<ConfigableHandler> };
    let Type = type ?? ConfigableHandler;
    if (interceptorsToken && !isFunction(interceptorsToken)) {
        options = {
            backend: arg as (Token<Backend<TInput, TOutput>> | Backend<TInput, TOutput>),
            interceptorsToken,
            guardsToken,
            filtersToken,
            execptionHandlers,
            enableTypeChain
        }
    } else {
        options = arg as ConfigableHandlerOptions<TInput>;
        if (interceptorsToken) {
            Type = interceptorsToken as Type;
        }
    }
    options = normalizeConfigableHandlerOptions(options);
    return new Type(createInjector(options, context), options)
}

export function normalizeConfigableHandlerOptions<T extends ConfigableHandlerOptions>(options: T): T {
    if (options.execptionHandlers) {
        const handles = isArray(options.execptionHandlers) ? options.execptionHandlers : [options.execptionHandlers];
        if (!options.providers) {
            options.providers = handles;
        } else {
            options.providers.push(handles)
        }
    }
    return options;
}

/**
 * set handler service with options.
 * @param service 
 * @param options 
 */
export function setHandlerOptions(service: HandlerService, options: ConfigableHandlerOptions) {
    options.pipes?.length && service.usePipes(options.pipes);
    options.filters?.length && service.useFilters(options.filters);
    options.guards?.length && service.useGuards(options.guards);
    options.interceptors?.length && service.useInterceptors(options.interceptors);
}