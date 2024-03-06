import { EMPTY, InjectFlags, Injector, InvocationContext, InvokerOptions, ProvdierOf, StaticProvider, Token, createContext, getClassName, isClassType, isInjector, isToken } from '@tsdi/ioc';
import { CanActivate, GUARDS_TOKEN, GuardsService } from '../guard';
import { INTERCEPTORS_TOKEN, Interceptor, InterceptorService } from '../Interceptor';
import { PipeService, PipeTransform } from '../pipes/pipe';
import { FILTERS_TOKEN, Filter, FilterService } from '../filters/filter';
import { BackendOptions, GuardHandler, GuardHandlerOptions } from './guards';


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
    /**
     * guards tokens.
     */
    guardsToken?: Token<CanActivate<TInput>[]>;
}

/**

/**
 * Configable handler options.
 */
export interface ConfigableHandlerOptions<TInput = any, TArg = any> extends HandlerOptions<TInput, TArg>, HandlerTokenConfigable<TInput>, BackendOptions<TInput> { }

/**
 * handler service.
 * 
 * 处理器服务
 */
export interface HandlerService extends FilterService, PipeService, InterceptorService, GuardsService {

}


/**
 * Configable handler
 */
export class ConfigableHandler<TInput = any, TOutput = any> extends GuardHandler<TInput, TOutput, ConfigableHandlerOptions> {
    constructor(
        context: Injector | InvocationContext,
        options: ConfigableHandlerOptions<TInput>) {
        super(isInjector(context) ? createContext(context) : context, {
            interceptorsToken: INTERCEPTORS_TOKEN,
            guardsToken: GUARDS_TOKEN,
            filtersToken: FILTERS_TOKEN,
            ...options
        });
        if (this.options.backend && isClassType(this.options.backend) && !this.injector.has(this.options.backend, InjectFlags.Self)) {
            this.injector.inject(this.options.backend);
        }

        setHandlerOptions(this, this.options as HandlerOptions);
    }

    /**
     *  get filters. 
     */
    protected override getFilters(): Filter<TInput, TOutput>[] {
        const { filtersToken, globalFiltersToken } = this.options;
        const filts = filtersToken ? this.injector.get(filtersToken, EMPTY) : EMPTY;
        return globalFiltersToken ? ([...this.injector.get(globalFiltersToken, EMPTY), ...filts]) : filts
    }

    protected override getInterceptors(): Interceptor<TInput, TOutput>[] {
        const { interceptorsToken, globalInterceptorsToken } = this.options;
        const itps = this.injector.get(interceptorsToken!, EMPTY);
        return globalInterceptorsToken ? [...this.injector.get(globalInterceptorsToken, EMPTY), ...itps] : itps
    }

    protected override getGuards(): CanActivate<any>[] | null {
        const { guardsToken, globalGuardsToken } = this.options;
        const guards = guardsToken ? this.injector.get(guardsToken, null) : null;
        return globalGuardsToken ? [...this.injector.get(globalGuardsToken, EMPTY), ...(guards ?? EMPTY)] : guards

    }
}


/**
 * create configable hanlder
 */
export function createHandler<TInput, TOutput>(injector: Injector | InvocationContext, options: ConfigableHandlerOptions<TInput>): ConfigableHandler<TInput, TOutput> {
    return new ConfigableHandler(injector, options)
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