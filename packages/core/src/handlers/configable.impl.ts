import {
    InjectFlags, Injector, ProvdierOf, Type, promiseOf, Exception, toProvider, AbstractType, getType, Token, isType,
    InvocationContext, createInvocationContext, ArgumentException, isToken, isArray, isFunction, composeInterceptors, chainFactory,
    some, InjectUtil, invokeTails, TailNext, toHandlerFn, HandleResult, hasProps
} from '@tsdi/ioc';
import { CanHandle, GuardLike, GUARDS_TOKEN } from '../guard';
import { INTERCEPTORS_TOKEN, Interceptor, InterceptorFn, InterceptorLike, InterceptorResolver } from '../interceptor';
import { FILTERS_TOKEN, Filter, FilterLike, FilterResolver, composeFilters } from '../filters/filter';
import { Handler, HandlerFn, HandlerLike } from '../handler';
import { AbstractConfigableHandler, ConfigableHandlerOptions, HandlerOptions } from './configable';




/**
 * Configable handlers
 */
export class ConfigableHandler<
    TInput = any,
    TOutput = any,
    TContext = any> implements AbstractConfigableHandler<TInput, TOutput, TContext> {

    private chain?: InterceptorFn<TInput, TOutput, TContext> | null;
    private chains: Map<AbstractType | string, InterceptorFn<TInput, TOutput, TContext> | null>;

    private _guards?: GuardLike[] | null;

    get ready() {
        return this.context.ready;
    }

    private _filterResolver?: FilterResolver;
    get filterResolver() {
        if (!this._filterResolver) {
            this._filterResolver = this.context.get(FilterResolver);
        }
        return this._filterResolver;
    }

    private _interceptorResolver?: InterceptorResolver;
    get interceptorResolver() {
        if (!this._interceptorResolver) {
            this._interceptorResolver = this.context.get(InterceptorResolver);
        }
        return this._interceptorResolver;
    }



    constructor(
        readonly context: InvocationContext,
        protected options: ConfigableHandlerOptions) {

        this.initOptions(options);
        if (this.options.backend && isType(this.options.backend) && !this.context.has(this.options.backend, InjectFlags.Self)) {
            InjectUtil.provider(this.context, this.options.backend);
        }

        this.append(this.options);
        this.chains = new Map();
    }

    protected onReady(): Promise<void> {
        return this.context.ready;
    }

    protected initOptions(options: ConfigableHandlerOptions): void {
        if (!options.interceptorsToken) {
            options.interceptorsToken = INTERCEPTORS_TOKEN;
        }
        if (!options.guardsToken) {
            options.guardsToken = GUARDS_TOKEN;
        }
        if (!options.filtersToken) {
            options.filtersToken = FILTERS_TOKEN;
        }
    }

    handle(input: TInput, context: TContext, tail?: TailNext<TOutput, TContext>): HandleResult<TOutput> {
        return invokeTails(
            async () => {
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
            },
            (r) => {
                if (r === true) {
                    return this.run(input, context);
                }
                throw this.forbiddenError()
            },
            tail
        );
    }


    append(options: HandlerOptions<TInput>): this {
        if (!options || !hasProps(options)) return this;
        if (options.pipes) {
            InjectUtil.inject(this.context, options.pipes);
        }
        if (options.guards) {
            if (!this.options.guardsToken) throw new ArgumentException('no guards token');
            this.regMulti(this.options.guardsToken, options.guards);
        }
        if (options.filters) {
            if (!this.options.filtersToken) throw new ArgumentException('no filters token');
            this.regMulti(this.options.filtersToken, options.filters);
        }
        if (options.interceptors) {
            if (!this.options.interceptorsToken) throw new ArgumentException('no interceptors token');
            this.regMulti(this.options.interceptorsToken, options.interceptors);
        }
        this.reset();
        return this;
    }

    private _destroyed = false;
    onDestroy(): void {
        if (this._destroyed) return;
        this._destroyed = true;
        this.clear();
    }

    protected run(input: TInput, context: TContext) {
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
    protected compose(): InterceptorFn<TInput, TOutput, TContext> {
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
        return this.options.handlerType ?? getType(this)
    }


    private backendFn?: HandlerFn<TInput, TOutput, TContext>;
    /**
     * get registered backend of the handler.
     * @returns 
     */
    protected getBackend(): HandlerFn<TInput, TOutput, TContext> {
        if (!this.options.backend) throw new ArgumentException('backend is Empty.');
        if (!this.backendFn) {
            const backend = isToken(this.options.backend) ? this.context.get(this.options.backend, this.options.backend as HandlerLike, InjectFlags.Default) : this.options.backend;
            this.backendFn = (isFunction(backend) ? backend : toHandlerFn(backend)) as HandlerFn<TInput, TOutput, TContext>;
        }
        return this.backendFn;
    }

    /**
     *  get filters. 
     */
    protected getFilters(): FilterLike<TInput, TOutput>[] {
        return this.options.filtersToken ? this.context.get(this.options.filtersToken, []) : [];
    }

    /**
     * get registered iterceptors of the handler.
     * @returns 
     */
    protected getInterceptors(): InterceptorLike<TInput, TOutput>[] {
        return this.context.get(this.options.interceptorsToken!, []);
    }


    /**
     * get registered guards of the handler.
     * @returns 
     */
    protected getGuards(): GuardLike[] | null {
        return this.options.guardsToken ? this.context.get(this.options.guardsToken, null) : null;
    }

    protected regMulti<T>(token: Token, providers: ProvdierOf<T> | ProvdierOf<T>[], multiOrder?: number) {
        const multi = true;
        if (isArray(providers)) {
            InjectUtil.inject(this.context, providers.map((r, i) => toProvider(token, r, { multi, multiOrder })))
        } else {
            InjectUtil.provider(this.context, toProvider(token, providers, { multi, multiOrder }));
        }
    }

    protected clear() {
        if (this.options.interceptorsToken) InjectUtil.unregister(this.context, this.options.interceptorsToken);
        if (this.options.guardsToken) InjectUtil.unregister(this.context, this.options.guardsToken);
        if (this.options.filtersToken) InjectUtil.unregister(this.context, this.options.filtersToken);
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
export function createHandler<TInput, TOutput>(context: Injector | InvocationContext, options: ConfigableHandlerOptions<TInput>): ConfigableHandler<TInput, TOutput>;

/**
 * create configable hanlder with options
 */
export function createHandler<TClass extends ConfigableHandler, TInput>(context: Injector | InvocationContext, options: ConfigableHandlerOptions<TInput>, type: TClass): TClass;
/**
 * create configable hanlder with param options
 * @param context 
 * @param backend 
 * @param interceptorsToken 
 * @param guardsToken 
 * @param filtersToken 
 */
export function createHandler<TInput, TOutput, TClass extends ConfigableHandler>(
    context: Injector | InvocationContext,
    backend: Token<Handler<TInput, TOutput>> | Handler<TInput, TOutput>,
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
    context: Injector | InvocationContext,
    arg: ConfigableHandlerOptions<TInput> | Token<Handler<TInput, TOutput>> | Handler<TInput, TOutput>,
    interceptorsToken?: Token<Interceptor<TInput, TOutput>[]> | Type<ConfigableHandler>,
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
    let options: ConfigableHandlerOptions<TInput> & { classType?: Type<ConfigableHandler> };
    let Type = type ?? ConfigableHandler;
    if (interceptorsToken && !isFunction(interceptorsToken)) {
        options = {
            ...appendOptions,
            backend: arg as (Token<Handler<TInput, TOutput>> | Handler<TInput, TOutput>),
            interceptorsToken,
            guardsToken,
            filtersToken
        }
    } else {
        options = arg as ConfigableHandlerOptions<TInput>;
        if (interceptorsToken) {
            Type = interceptorsToken as Type;
        }
    }
    options = normalizeConfigableHandlerOptions(options);
    return new Type(createInvocationContext(context, options, options.handlerType), options)
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
