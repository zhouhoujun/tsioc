import { getTokenOf, InvokeArguments, ProvdierOf, StaticProvider, Token, TypeOf } from '@tsdi/ioc';
import { PipeService } from './pipes/pipe.service';
import { FilterService } from './filters/filter.service';
import { CanActivate } from './guard';
import { Interceptor, InterceptorService } from './Interceptor';
import { PipeTransform } from './pipes/pipe';
import { Filter } from './filters/filter';
import { EndpointContext } from './endpoints/context';


/**
 * endpoint service.
 */
export interface EndpointService extends FilterService, PipeService, InterceptorService {
    /**
     * use guards.
     * @param guards
     * @param order 
     */
    useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number): this;
}


/**
 * endpoint service options.
 */
export interface EndpointServiceOptions<TCtx extends EndpointContext = EndpointContext> {
    /**
     * An array of dependency-injection tokens used to look up `CanActivate()`
     * handlers, in order to determine if the current user is allowed to
     * activate the component. By default, any user can activate.
     */
    guards?: ProvdierOf<CanActivate>[];
    /**
     * interceptors of bootstrap.
     */
    interceptors?: ProvdierOf<Interceptor<TCtx>>[];
    /**
     * pipes for the bootstrap.
     */
    pipes?: StaticProvider<PipeTransform>[];
    /**
     * filters of bootstrap.
     */
    filters?: ProvdierOf<Filter<TCtx>>[];
}

/**
 * set endpoint service with options.
 * @param service 
 * @param options 
 */
export function setOptions(service: EndpointService, options: EndpointServiceOptions) {
    options.pipes && service.usePipes(options.pipes);
    options.filters && service.useFilter(options.filters);
    options.guards && service.useGuards(options.guards);
    options.interceptors && service.useInterceptor(options.interceptors);
}

const GUARDS = 'GUARDS';
/**
 * get target guards token.
 * @param request 
 * @returns 
 */
export function getGuardsToken(type: TypeOf<any>, propertyKey?: string): Token<CanActivate[]> {
    return getTokenOf(type, GUARDS, propertyKey)
}

/**
 * endpoint options.
 */
export interface EndpointOptions<T = any> extends EndpointServiceOptions, InvokeArguments<T> {

}
