import {
    EMPTY, InjectFlags, Injector, ProvdierOf, StaticProvider, ClassType, lang, promiseOf, Execption, isFunction,
    Token, InvocationContext, createContext, isClassType, ArgumentExecption, isToken, isArray, toProvider,
} from '@tsdi/ioc';
import { CanHandle, GuardLike, GUARDS_TOKEN } from '../guard';
import { INTERCEPTORS_TOKEN, Interceptor, InterceptorLike } from '../Interceptor';
import { PipeTransform } from '../pipes/pipe';
import { FILTERS_TOKEN, Filter, FilterLike } from '../filters/filter';
import { Backend, Handler } from '../Handler';
import { AbstractConfigableHandler, ConfigableHandlerOptions, HandlerOptions, HandlerService, TypeConfigableHandlerOptions } from './configable';
import { defer, mergeMap, Observable, Subject, takeUntil, throwError } from 'rxjs';
import { InterceptorHandler } from './handler';



/**
 * Configable handler
 */
export class ConfigableHandler<
    TInput = any,
    TOutput = any,
    TOptions extends ConfigableHandlerOptions<TInput> = ConfigableHandlerOptions<TInput>,
    TContext = any> implements AbstractConfigableHandler<TInput, TOutput, TOptions, TContext> {

    private destroy$ = new Subject<void>();
    private chain?: Handler<TInput, TOutput, TContext> | null;

    private _guards?: GuardLike[] | null;

    protected options: TOptions;

    get injector() {
        return this.context.injector;
    }

    get ready() {
        return this.context.injector.ready;
    }

    getOptions(): TOptions {
        return this.options;
    }

    constructor(
        protected context: InvocationContext,
        options: TOptions) {

        this.options = this.initOptions(options);
        if (this.options.backend && isClassType(this.options.backend) && !this.injector.has(this.options.backend, InjectFlags.Self)) {
            this.injector.inject(this.options.backend);
        }

        setHandlerOptions(this, this.options);
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

            if (!(await lang.some(
                this._guards!.map(gd => () => promiseOf(isFunction(gd) ? gd(input, context) : gd.canHandle(input, context))),
                vaild => vaild === false))) {
                return false;
            }
            return true;
        }).pipe(
            mergeMap(r => {
                if (r === true) {
                    if (!this.chain) {
                        this.chain = this.compose();
                    }
                    return this.chain.handle(input, context);
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
        this.injector.inject(pipes);
        return this;
    }

    /**
     * use interceptor for the handler.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    useInterceptors(interceptor: ProvdierOf<InterceptorLike<TInput, TOutput>> | ProvdierOf<InterceptorLike<TInput, TOutput>>[], order?: number): this {
        if (!this.options.interceptorsToken) return this;
        this.regMulti(this.options.interceptorsToken, interceptor, order);
        this.reset();
        return this;
    }


    /**
     * use guards for the handler.
     * @param guards 
     */
    useGuards(guards: ProvdierOf<CanHandle> | ProvdierOf<CanHandle>[], order?: number): this {
        if (!this.options.guardsToken) throw new ArgumentExecption('no guards token');
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
    useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this {
        if (!this.options.filtersToken) throw new ArgumentExecption('no filters token');
        this.regMulti(this.options.filtersToken, filter, order);
        this.reset();
        return this;
    }

    protected reset(): void {
        this.chain = null;
        this._guards = undefined;
    }

    private _destroyed = false;
    onDestroy(): void {
        if (this._destroyed) return;
        this._destroyed = true;
        this.destroy$.next();
        this.destroy$.complete();
        this.clear();
    }

    protected forbiddenError(): Execption {
        return new Execption('Forbidden')
    }


    /**
     * compose iterceptors and filters in chain.
     * @returns 
     */
    protected compose(): Handler<TInput, TOutput> {
        const filters = this.getFilters();
        const inteceptors = this.getInterceptors();
        return [...filters, ...inteceptors].reduceRight(
            (next, inteceptor) => new InterceptorHandler(next, inteceptor), this.getBackend());
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
    protected getFilters(): FilterLike<TInput, TOutput>[] {
        return this.options.filtersToken ? this.injector.get(this.options.filtersToken, EMPTY) : EMPTY;
    }

    /**
     * get registered iterceptors of the handler.
     * @returns 
     */
    protected getInterceptors(): InterceptorLike<TInput, TOutput>[] {
        return this.injector.get(this.options.interceptorsToken!, EMPTY);
    }


    /**
     * get registered guards of the handler.
     * @returns 
     */
    protected getGuards(): GuardLike[] | null {
        return this.options.guardsToken ? this.injector.get(this.options.guardsToken, null) : null;
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
        if (this.options.interceptorsToken) this.injector.unregister(this.options.interceptorsToken);
        if (this.options.guardsToken) this.injector.unregister(this.options.guardsToken);
        if (this.options.filtersToken) this.injector.unregister(this.options.filtersToken);
        this.context = null!;
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
export function createHandler<TClass extends ConfigableHandler, TInput>(context: Injector | InvocationContext, options: TypeConfigableHandlerOptions<TClass, TInput>): TClass;
/**
 * create configable hanlder with param options
 * @param context 
 * @param backend 
 * @param interceptorsToken 
 * @param guardsToken 
 * @param filtersToken 
 */
export function createHandler<TInput, TOutput, TClass extends ConfigableHandler>(context: Injector | InvocationContext,
    backend: Token<Backend<TInput, TOutput>> | Backend<TInput, TOutput>,
    interceptorsToken: Token<Interceptor<TInput, TOutput>[]>,
    guardsToken?: Token<CanHandle[]>,
    filtersToken?: Token<Filter<TInput, TOutput>[]>,
    /**
     * execption handlers
     */
    execptionHandlers?: ClassType<any> | ClassType[]
): ConfigableHandler<TInput, TOutput>;
export function createHandler<TInput, TOutput>(context: Injector | InvocationContext, arg: ConfigableHandlerOptions<TInput> | Token<Backend<TInput, TOutput>> | Backend<TInput, TOutput>,
    interceptorsToken?: Token<Interceptor<TInput, TOutput>[]>,
    guardsToken?: Token<CanHandle[]>,
    filtersToken?: Token<Filter<TInput, TOutput>[]>,
    execptionHandlers?: ClassType<any> | ClassType[],
): ConfigableHandler<TInput, TOutput> {
    let options: ConfigableHandlerOptions<TInput> & { classType?: ClassType<ConfigableHandler> };
    if (interceptorsToken) {
        options = {
            backend: arg as (Token<Backend<TInput, TOutput>> | Backend<TInput, TOutput>),
            interceptorsToken,
            guardsToken,
            filtersToken,
            execptionHandlers
        }
    } else {
        options = arg as ConfigableHandlerOptions<TInput>;
    }
    options = normalizeConfigableHandlerOptions(options);
    const Type = options.classType ?? ConfigableHandler;
    return new Type(createContext(context, options), options)
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