import { Abstract, ClassType, EMPTY, Execption, Injector, InvokerOptions, ProvdierOf, StaticProvider, Token, Type } from '@tsdi/ioc';
import { CanActivate, GuardsService } from '../guard';
import { Interceptor, InterceptorService } from '../Interceptor';
import { PipeService, PipeTransform } from '../pipes/pipe';
import { Filter, FilterService } from '../filters/filter';
import { Backend, Handler } from '../Handler';
import { Decoder, Encoder } from '../coding';


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
 * Configable handler options.
 */
export interface ConfigableHandlerOptions<TInput = any, TArg = any> extends HandlerOptions<TInput, TArg> {
    backend?: ClassType<Backend>;
    
    encoder?: ProvdierOf<Encoder>;
    decoder?: ProvdierOf<Decoder>;

    interceptorsToken?: Token<Interceptor<TInput>[]>;
    guardsToken?: Token<CanActivate<TInput>[]>;
    filtersToken?: Token<Filter<TInput>[]>;
}

/**
 * handler service.
 * 
 * 处理器服务
 */
export interface HandlerService extends FilterService, PipeService, InterceptorService, GuardsService {

}

/**
* Configable hanlder
*/
@Abstract()
export abstract class ConfigableHandler<TInput = any, TOutput = any> extends Handler<TInput, TOutput> implements HandlerService {

    abstract get injector(): Injector;

    abstract useGuards(guards: ProvdierOf<CanActivate<TInput>> | ProvdierOf<CanActivate<TInput>>[], order?: number): this;

    abstract useFilters(filter: ProvdierOf<Filter<TInput, TOutput>> | ProvdierOf<Filter<TInput, TOutput>>[], order?: number): this;

    abstract usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this;

    abstract useInterceptors(interceptor: ProvdierOf<Interceptor<TInput, TOutput>> | ProvdierOf<Interceptor<TInput, TOutput>>[], order?: number): this;
}

/**
 * Configable Handler factory implement.
 */
export const CONFIGABLE_HANDLER_IMPL = {
    /**
     * create invocation context
     * @param parent parent context or parent injector. 
     * @param options invocation options.
     */
    create<TInput, TOutput>(injector: Injector, options: ConfigableHandlerOptions<TInput>): ConfigableHandler<TInput, TOutput> {
        throw new Execption('not implemented.')
    }
};

/**
 * create configable hanlder
 */
export function createHandler<TInput, TOutput>(injector: Injector, options: ConfigableHandlerOptions<TInput>): ConfigableHandler<TInput, TOutput> {
    return CONFIGABLE_HANDLER_IMPL.create(injector, options)
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