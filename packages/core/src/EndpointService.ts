import { InvokeArguments, TypeOf } from '@tsdi/ioc';
import { PipeService } from './pipes/pipe.service';
import { FilterService } from './filters/filter.service';
import { CanActivate } from './guard';
import { Interceptor, InterceptorService } from './Interceptor';
import { PipeTransform } from './pipes/pipe';
import { Filter } from './filters/filter';


/**
 * endpoint service.
 */
export interface EndpointService extends FilterService, PipeService, InterceptorService {
    /**
     * use guards.
     * @param guards 
     */
    useGuards(guards: TypeOf<CanActivate> | TypeOf<CanActivate>[]): this;
}


/**
 * endpoint service options.
 */
export interface EndpointServiceOptions {
    /**
     * An array of dependency-injection tokens used to look up `CanActivate()`
     * handlers, in order to determine if the current user is allowed to
     * activate the component. By default, any user can activate.
     */
    guards?: TypeOf<CanActivate>[];
    /**
     * interceptors of bootstrap.
     */
    interceptors?: TypeOf<Interceptor>[];
    /**
     * pipes for the bootstrap.
     */
    pipes?: TypeOf<PipeTransform>[];
    /**
     * filters of bootstrap.
     */
    filters?: TypeOf<Filter>[];
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

/**
 * endpoint options.
 */
export interface EndpointOptions extends EndpointServiceOptions, InvokeArguments {

}
