import { Abstract, getTokenOf, InvocationContext, InvokeArguments, ProvdierOf, StaticProvider, Token, TypeOf } from '@tsdi/ioc';
import { PipeService } from './pipes/pipe.service';
import { FilterService } from './filters/filter.service';
import { CanActivate } from './guard';
import { Interceptor, InterceptorService } from './Interceptor';
import { PipeTransform } from './pipes/pipe';
import { Filter } from './filters/filter';
import { Endpoint } from './Endpoint';
import { Observable } from 'rxjs';


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
export interface EndpointServiceOptions<TCtx extends InvocationContext = InvocationContext> {
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
    options.filters && service.useFilters(options.filters);
    options.guards && service.useGuards(options.guards);
    options.interceptors && service.useInterceptors(options.interceptors);
}

const GUARDS = 'GUARDS';
/**
 * get target guards token.
 * @param request 
 * @returns 
 */
export function getGuardsToken(type: TypeOf<any>|string, propertyKey?: string): Token<CanActivate[]> {
    return getTokenOf(type, GUARDS, propertyKey)
}

/**
 * MicroService endpoint.
 */
@Abstract()
export abstract class MicroServiceEndpoint<TCtx extends InvocationContext, TOutput> implements Endpoint<TCtx, TOutput>, EndpointService {

    abstract handle(context: TCtx): Observable<TOutput>;

    abstract useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number): this;

    abstract useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this;

    abstract usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this;

    abstract useInterceptors(interceptor: ProvdierOf<Interceptor> | ProvdierOf<Interceptor>[], order?: number): this;
}

/**
 * endpoint options.
 */
export interface EndpointOptions<T = any> extends EndpointServiceOptions, InvokeArguments<T> {

}
