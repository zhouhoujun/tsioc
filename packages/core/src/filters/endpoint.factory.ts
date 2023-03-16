import { Abstract, InvokeArguments, Type, Class, ReflectiveRef, TypeOf, Injector } from '@tsdi/ioc';
import { Endpoint } from '../Endpoint';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { PipeTransform } from '../pipes/pipe';
import { RunnableRef } from '../runners';
import { EndpointContext } from './context';
import { Filter, Respond } from './filter';


/**
 * Filter options.
 */
export interface FilterOptions {
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
 * endpoint options.
 */
export interface EndpointOptions extends InvokeArguments, FilterOptions {

}


/**
 * bootstrap option for {@link RunnableRef}.
 */
export interface BootstrapOption extends EndpointOptions {
    /**
     * bootstrap order
     */
    order?: number;
    /**
     * handle expection as response type.
     */
    response?: 'body' | 'header' | 'response' | Type<Respond> | ((ctx: EndpointContext, returnning: any) => void)
}


/**
 * endpoint factory.
 */
@Abstract()
export abstract class EndpointFactory<T> {

    abstract get typeRef(): ReflectiveRef<T>;

    abstract create(propertyKey: string, options: BootstrapOption): Endpoint;
}

/**
 * endpoint factory resolver.
 */
export abstract class EndpointFactoryResolver {
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(type: ReflectiveRef<T>, categare?: 'event' | 'filter' | 'runnable' | 'route'): EndpointFactory<T>;
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(type: Type<T> | Class<T>, injector: Injector, categare?: 'event' | 'filter' | 'runnable' | 'route'): EndpointFactory<T>;
}
