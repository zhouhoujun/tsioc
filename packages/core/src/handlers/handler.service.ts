import { Abstract, EMPTY, Injector, InvokeArguments, ProvdierOf, StaticProvider, Token, Type } from '@tsdi/ioc';
import { CanActivate, GuardsService } from '../guard';
import { Interceptor, InterceptorService } from '../Interceptor';
import { PipeService, PipeTransform } from '../pipes/pipe';
import { Filter, FilterService } from '../filters/filter';
import { Backend, Handler } from '../Handler';


/**
 * handler service options.
 */
export interface HandlerOptions<TInput = any, TArg = any> extends InvokeArguments<TArg> {
    /**
     * An array of dependency-injection tokens used to look up `CanActivate()`
     * handlers, in order to determine if the current user is allowed to
     * activate the component. By default, any user can activate.
     */
    guards?: ProvdierOf<CanActivate>[];
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

export interface ConfigableHandlerOptions<TInput = any, TArg = any> extends HandlerOptions<TInput, TArg> {
    backend: Type<Backend>;
    interceptorsToken?: Token<Interceptor[]>;
    guardsToken?: Token<CanActivate[]>;
    filtersToken?: Token<Filter[]>;
}

/**
 * handler service.
 */
export interface HandlerService extends FilterService, PipeService, InterceptorService, GuardsService {

}

/**
* Configable hanlder
*/
@Abstract()
export abstract class ConfigableHandler<TInput = any, TOutput = any> extends Handler<TInput, TOutput> implements HandlerService {

    abstract get injector(): Injector;

    abstract useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number): this;

    abstract useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this;

    abstract usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this;

    abstract useInterceptors(interceptor: ProvdierOf<Interceptor> | ProvdierOf<Interceptor>[], order?: number): this;
}


/**
 * set handler service with options.
 * @param service 
 * @param options 
 */
export function setHandlerOptions(service: HandlerService, options: HandlerOptions) {
    options.pipes && service.usePipes(options.pipes);
    service.useFilters(options.filters ?? EMPTY);
    service.useGuards(options.guards ?? EMPTY);
    service.useInterceptors(options.interceptors ?? EMPTY);
}