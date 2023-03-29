import { Abstract, Class, Injector, ReflectiveRef, Type } from '@tsdi/ioc';
import { BootstrapOption, OperationEndpoint } from '../endpoints/endpoint.factory';


/**
 * Opteration Endpoint
 */
export abstract class RouteEndpoint extends OperationEndpoint {
    /**
     * invoker.
     */
    abstract get prefix(): string
}

/**
 * Route endpoint options.
 */
export interface RouteEndpointOptions<T = any> extends BootstrapOption<T> {
    /**
     * route prefix
     */
    prefix?: string;
}

/**
 * route endpoint factory.
 */
@Abstract()
export abstract class RouteEndpointFactory<T> {

    abstract get typeRef(): ReflectiveRef<T>;

    abstract create<TArg>(propertyKey: string, options: RouteEndpointOptions<TArg>): OperationEndpoint;
}


/**
 * route endpoint factory resolver.
 */
@Abstract()
export abstract class RouteEndpointFactoryResolver {
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(type: ReflectiveRef<T>): RouteEndpointFactory<T>;
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(type: Type<T> | Class<T>, injector: Injector): RouteEndpointFactory<T>;
}

