import { Abstract, getTokenOf, InvocationContext, InvokeArguments, ProvdierOf, StaticProvider, Token, Type, TypeOf } from '@tsdi/ioc';
import { PipeService } from '../pipes/pipe.service';
import { FilterService } from '../filters/filter.service';
import { CanActivate } from '../guard';
import { Interceptor, InterceptorService } from '../Interceptor';
import { PipeTransform } from '../pipes/pipe';
import { Filter } from '../filters/filter';


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
export interface EndpointServiceOptions<TInput = any> {
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
 * endpoint options.
 */
export interface EndpointOptions<T = any> extends EndpointServiceOptions, InvokeArguments<T> {
    /**
     * endpoint order
     */
    order?: number;
    /**
     * endpoint handler response as.
     */
    response?: 'body' | 'header' | 'response' | Type<Respond<T>> | ((input: T, returnning: any) => void)
}



@Abstract()
export abstract class Respond<TInput = any> {

    /**
     * respond with execption handled data.
     * @param input endpoint input data.
     * @param value execption handled returnning value
     */
    abstract respond<T>(input: TInput, value: T): void;
}

/**
 * Execption respond adapter with response type.
 */
@Abstract()
export abstract class TypedRespond<TInput = any>  {
    /**
     * respond with execption handled data.
     * @param input endpoint input data.
     * @param responseType response type
     * @param value execption handled returnning value
     */
    abstract respond<T>(input: TInput, responseType: 'body' | 'header' | 'response', value: T): void;
}
