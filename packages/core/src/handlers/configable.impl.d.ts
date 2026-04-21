import { Injector, ProvdierOf, Type, Exception, AbstractType, Token, Provider } from '@tsdi/ioc';
import { CanHandle, GuardLike } from '../guard';
import { Interceptor, InterceptorFn, InterceptorLike, InterceptorResolver } from '../interceptor';
import { Filter, FilterFn, FilterLike, FilterResolver } from '../filters/filter';
import { Handler, HandlerFn, HandlerLike, RunContext } from '../handler';
import { AbstractConfigableHandler, ConfigableHandlerOptions, HandlerOptions } from './configable';
/**
 * Configable handlers
 */
export declare class ConfigableHandler<TInput = any, TOutput = any, TContext extends RunContext = RunContext> implements AbstractConfigableHandler<TInput, TOutput, TContext> {
    readonly injector: Injector;
    protected options: ConfigableHandlerOptions;
    private chain?;
    private chains;
    private _guards?;
    get ready(): Promise<void>;
    private _filterResolver?;
    get filterResolver(): FilterResolver;
    private _interceptorResolver?;
    get interceptorResolver(): InterceptorResolver;
    constructor(injector: Injector, options: ConfigableHandlerOptions);
    protected onReady(): Promise<void>;
    protected initOptions(options: ConfigableHandlerOptions): void;
    handle(input: TInput, context: TContext): TOutput;
    append(options: HandlerOptions<TInput>): this;
    private _destroyed;
    onDestroy(): void;
    protected canHandle(input: TInput, context: TContext): Promise<boolean>;
    protected run(input: TInput, context: TContext): TOutput;
    protected running(chain: InterceptorFn, intput: TInput, backend: HandlerFn, context: TContext): TOutput;
    /**
     * get input chain, register by `@Filterable` or `@Interceptable`
     * @param input
     * @returns
     */
    protected getChain(input: TInput): InterceptorFn<TInput, TOutput, TContext>;
    /**
     * get chain of type, register by `@Filterable` or `@Interceptable`
     * @param type
     * @returns
     */
    protected getChainOf(type: AbstractType | string): InterceptorFn<TInput, TOutput, TContext>;
    /**
     * componse chain of type, register by `@Filterable` or `@Interceptable`
     * @param type
     * @returns
     */
    protected composeTypeChain(type: AbstractType | string): InterceptorFn<TInput, TOutput, TContext> | null;
    protected resetChain(): void;
    protected resetGuards(): void;
    protected resetBackend(): void;
    protected forbiddenError(): Exception;
    /**
     * compose iterceptors and filters in chain.
     * @returns
     */
    protected compose(): InterceptorFn<TInput, TOutput, TContext>;
    protected composeFilterFn(filters: FilterLike[]): FilterFn;
    protected generateInterceptorFn(fns: InterceptorLike[]): InterceptorFn;
    protected getHandlerType(): AbstractType;
    private backendFn?;
    /**
     * get registered backend of the handler.
     * @returns
     */
    protected getBackend(): HandlerFn<TInput, TOutput, TContext>;
    protected generateBackendFn(): HandlerFn;
    /**
     *  get filters.
     */
    protected getFilters(): FilterLike<TInput, TOutput>[];
    /**
     * get registered iterceptors of the handler.
     * @returns
     */
    protected getInterceptors(): InterceptorLike<TInput, TOutput>[];
    /**
     * get registered guards of the handler.
     * @returns
     */
    protected getGuards(): GuardLike[] | null;
    protected regMulti<T>(token: Token, providers: ProvdierOf<T> | ProvdierOf<T>[], multiOrder?: number): void;
    protected clear(): void;
}
/**
 * create configable hanlder with options
 */
export declare function createHandler<TInput, TOutput>(context: Injector, options: ConfigableHandlerOptions<TInput>): ConfigableHandler<TInput, TOutput>;
/**
 * create configable hanlder with param options
 * @param context
 * @param backend
 * @param interceptorsToken
 * @param guardsToken
 * @param filtersToken
 */
export declare function createHandler<TInput, TOutput, TClass extends ConfigableHandler>(context: Injector, backend: ProvdierOf<HandlerLike<TInput, TOutput>>, backendToken: Token<Handler<TInput, TOutput>[]>, interceptorsToken: Token<Interceptor<TInput, TOutput>[]>, guardsToken?: Token<CanHandle[]>, filtersToken?: Token<Filter<TInput, TOutput>[]>, options?: {
    /**
     * execption handlers
     */
    execptionHandlers?: Type<any> | Type[] | null;
    enableTypeChain?: boolean;
} & HandlerOptions<TInput>, type?: Type): ConfigableHandler<TInput, TOutput>;
export declare function normalizeConfigableHandlerOptions(options: {
    providers?: Provider[];
    execptionHandlers?: Type<any> | Type[] | null;
}): void;
