import {
    Injector, ProvdierOf, Type, toPromise, Exception, toProvider, AbstractType, getType, Token,
    createInjector, ArgumentException, isArray, isFunction, composeInterceptors, chainFactory,
    some, InjectUtil, invokeTail, hasProps, composeHandlers, Provider
} from '@tsdi/ioc';
import { CanHandle, GuardLike, GUARDS_TOKEN } from '../guard';
import { INTERCEPTORS_TOKEN, Interceptor, InterceptorFn, InterceptorLike, InterceptorResolver } from '../interceptor';
import { FILTERS_TOKEN, Filter, FilterFn, FilterLike, FilterResolver, composeFilters } from '../filters/filter';
import { BACKENDS_TOKEN, Handler, HandlerFn, HandlerLike, RunContext } from '../handler';
import { AbstractConfigableHandler, ConfigableHandlerOptions, HandlerOptions } from './configable';




/**
 * Configable handlers
 */
export class ConfigableHandler<
    TInput = any,
    TOutput = any,
    TContext extends RunContext = RunContext> implements AbstractConfigableHandler<TInput, TOutput, TContext> {

    private chain?: InterceptorFn<TInput, TOutput, TContext> | null;
    private chains: Map<AbstractType | string, InterceptorFn<TInput, TOutput, TContext> | null>;

    private _guards?: GuardLike[] | null;

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



    constructor(
        readonly injector: Injector,
        protected options: ConfigableHandlerOptions) {
        this.chains = new Map();
        this.initOptions(options);
        this.append(this.options);
    }

    protected onReady(): Promise<void> {
        return this.injector.ready;
    }

    protected initOptions(options: ConfigableHandlerOptions): void {
        const features = (options as ConfigableHandlerOptions & { features?: ConfigableHandlerOptions }).features;
        if (!options.backendToken) {
            options.backendToken = features?.backendToken ?? BACKENDS_TOKEN;
        }
        if (!options.interceptorsToken) {
            options.interceptorsToken = features?.interceptorsToken ?? INTERCEPTORS_TOKEN;
        }
        if (!options.guardsToken) {
            options.guardsToken = features?.guardsToken ?? GUARDS_TOKEN;
        }
        if (!options.filtersToken) {
            options.filtersToken = features?.filtersToken ?? FILTERS_TOKEN;
        }
    }


    handle(input: TInput, context: TContext): TOutput {
        return invokeTail(
            () => this.canHandle(input, context),
            (r) => {
                if (r === true) {
                    return this.run(input, context);
                }
                throw this.forbiddenError()
            }
        ) as TOutput;
    }


    append(options: HandlerOptions<TInput>): this {
        if (!options || !hasProps(options)) return this;

        if (options.backend) {
            this.regMulti(this.options.backendToken!, options.backend, 0);
            this.resetBackend()
        }
        if (options.pipes) {
            InjectUtil.inject(this.injector, options.pipes);
        }
        if (options.guards) {
            this.regMulti(this.options.guardsToken!, options.guards);
            this.resetGuards()
        }
        if (options.filters) {
            this.regMulti(this.options.filtersToken!, options.filters);
            this.resetChain();
        }
        if (options.interceptors) {
            this.regMulti(this.options.interceptorsToken!, options.interceptors);
            this.resetChain();
        }

        return this;
    }

    private _destroyed = false;
    onDestroy(): void {
        if (this._destroyed) return;
        this._destroyed = true;
        this.clear();
    }

    protected async canHandle(input: TInput, context: TContext): Promise<boolean> {
        if (this.onReady) await this.onReady();

        if (this._guards === undefined) {
            this._guards = this.getGuards() ?? null;
        }

        if (!this._guards || !this._guards.length) return true;

        if (!(await some(
            this._guards!.map(gd => () => toPromise(isFunction(gd) ? gd(input, context) : gd.canHandle(input, context))),
            vaild => vaild === false))) {
            return false;
        }
        return true;
    }

    protected run(input: TInput, context: TContext): TOutput {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return this.running(this.getChain(input), input, this.getBackend(), context);
    }

    protected running(chain: InterceptorFn, intput: TInput, backend: HandlerFn, context: TContext): TOutput {
        return chain(intput, backend, context)
    }

    /**
     * get input chain, register by `@Filterable` or `@Interceptable`
     * @param input 
     * @returns 
     */
    protected getChain(input: TInput): InterceptorFn<TInput, TOutput, TContext> {
        return this.options.enableTypeChain ? this.getChainOf(getType(input)) : this.chain!;
    }

    /**
     * get chain of type, register by `@Filterable` or `@Interceptable`
     * @param type 
     * @returns 
     */
    protected getChainOf(type: AbstractType | string): InterceptorFn<TInput, TOutput, TContext> {
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
    protected composeTypeChain(type: AbstractType | string): InterceptorFn<TInput, TOutput, TContext> | null {
        const filters = this.filterResolver.resolve(type);
        const inteceptors = this.interceptorResolver.resolve(type);
        if (!(filters.length || inteceptors.length)) return null;

        const fns = [];
        if (filters?.length) fns.push(this.composeFilterFn(filters));
        if (inteceptors?.length) fns.push(...inteceptors);

        return chainFactory(composeInterceptors(fns), this.chain!);
    }


    protected resetChain(): void {
        this.chain = null;
        this.chains?.clear();
    }
    protected resetGuards(): void {
        this._guards = undefined;
    }
    protected resetBackend(): void {
        this.backendFn = undefined;
    }


    protected forbiddenError(): Exception {
        return new Exception('Forbidden')
    }


    /**
     * compose iterceptors and filters in chain.
     * @returns 
     */
    protected compose(): InterceptorFn<TInput, TOutput, TContext> {
        const type = this.getHandlerType();
        const hdlFilters = this.filterResolver.resolve(type) ?? [];
        const hdlInteceptors = this.interceptorResolver.resolve(type) ?? [];

        const filters = this.getFilters();
        const inteceptors = this.getInterceptors();
        const fns = [];
        if (hdlFilters?.length) fns.push(this.composeFilterFn(hdlFilters));
        if (hdlInteceptors?.length) fns.push(...hdlInteceptors);
        if (filters?.length) fns.push(this.composeFilterFn(filters));
        if (inteceptors?.length) fns.push(...inteceptors);
        return this.generateInterceptorFn(fns);
    }

    protected composeFilterFn(filters: FilterLike[]): FilterFn {
        return composeFilters(filters);
    }

    protected generateInterceptorFn(fns: InterceptorLike[]) {
        return composeInterceptors(fns);
    }

    protected getHandlerType(): AbstractType {
        return this.options.handlerType ?? getType(this)
    }


    private backendFn?: HandlerFn<TInput, TOutput, TContext>;
    /**
     * get registered backend of the handler.
     * @returns 
     */
    protected getBackend(): HandlerFn<TInput, TOutput, TContext> {
        if (!this.backendFn) {
            this.backendFn = this.generateBackendFn();
        }
        return this.backendFn;
    }

    protected generateBackendFn() {
        const handlers = this.injector.get(this.options.backendToken!);
        if (!handlers?.length) throw new ArgumentException('no backend handler.');
        return composeHandlers(handlers);

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
    protected getInterceptors(): InterceptorLike<TInput, TOutput>[] {
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
            InjectUtil.inject(this.injector, providers.map((r, i) => toProvider(token, r, { multi, multiOrder })))
        } else {
            InjectUtil.provider(this.injector, toProvider(token, providers, { multi, multiOrder }));
        }
    }

    protected clear() {
        InjectUtil.unregister(this.injector, this.options.interceptorsToken!);
        InjectUtil.unregister(this.injector, this.options.guardsToken!);
        InjectUtil.unregister(this.injector, this.options.filtersToken!);
        this.chain = undefined;
        this.backendFn = undefined;
        this.chains?.clear();
        this._filterResolver = undefined;
        this._interceptorResolver = undefined;
        // this.context = null!;
        // this.options = null!;
    }
}



/**
 * create configable hanlder with options
 */
export function createHandler<TInput, TOutput>(context: Injector, options: ConfigableHandlerOptions<TInput>): ConfigableHandler<TInput, TOutput>;

/**
 * create configable hanlder with param options
 * @param context 
 * @param backend 
 * @param interceptorsToken 
 * @param guardsToken 
 * @param filtersToken 
 */
export function createHandler<TInput, TOutput, TClass extends ConfigableHandler>(
    context: Injector,
    backend: ProvdierOf<HandlerLike<TInput, TOutput>>,
    backendToken: Token<Handler<TInput, TOutput>[]>,
    interceptorsToken: Token<Interceptor<TInput, TOutput>[]>,
    guardsToken?: Token<CanHandle[]>,
    filtersToken?: Token<Filter<TInput, TOutput>[]>,
    options?: {
        /**
         * execption handlers
         */
        execptionHandlers?: Type<any> | Type[] | null,
        enableTypeChain?: boolean
    } & HandlerOptions<TInput>,
    type?: Type
): ConfigableHandler<TInput, TOutput>;
export function createHandler<TInput, TOutput>(
    context: Injector,
    arg: ConfigableHandlerOptions<TInput> | ProvdierOf<HandlerLike<TInput, TOutput>>,
    backendToken?: Token<Handler<TInput, TOutput>[]>,
    interceptorsToken?: Token<Interceptor<TInput, TOutput>[]>,
    guardsToken?: Token<CanHandle[]>,
    filtersToken?: Token<Filter<TInput, TOutput>[]>,
    appendOptions?: {
        /**
         * execption handlers
         */
        execptionHandlers?: Type<any> | Type[] | null,
        enableTypeChain?: boolean
    } & HandlerOptions<TInput>,
    type?: Type
): ConfigableHandler<TInput, TOutput> {
    let options: ConfigableHandlerOptions<TInput>;
    let Type = type ?? ConfigableHandler;
    if (backendToken) {
        options = {
            ...appendOptions,
            backend: arg as ProvdierOf<HandlerLike<TInput, TOutput>>,
            backendToken,
            interceptorsToken,
            guardsToken,
            filtersToken
        }
    } else {
        options = arg as ConfigableHandlerOptions<TInput>;
        if (!type) {
            Type = options.handlerType!;
        }
    }
    normalizeConfigableHandlerOptions(options);
    return new Type(createInjector(context, options, Type), options)
}

export function normalizeConfigableHandlerOptions(options: { providers?: Provider[], execptionHandlers?: Type<any> | Type[] | null }): void {
    if (options.execptionHandlers) {
        const handles = isArray(options.execptionHandlers) ? options.execptionHandlers : [options.execptionHandlers];
        if (!options.providers) {
            options.providers = handles;
        } else {
            options.providers.push(handles)
        }
    }
}
