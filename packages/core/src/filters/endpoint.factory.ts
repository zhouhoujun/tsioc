import { Abstract, InvokeArguments, Type, Class, ReflectiveRef, TypeOf, Injector } from '@tsdi/ioc';
import { Endpoint } from '../Endpoint';
import { CanActivate } from '../guard';

/**
 * endpoint options.
 */
export interface EndpointOptions extends InvokeArguments {
    guards?: TypeOf<CanActivate>[];
    order?: number;
}

/**
 * endpoint factory.
 */
@Abstract()
export abstract class EndpointFactory<T> {

    abstract get typeRef(): ReflectiveRef<T>;

    abstract create(propertyKey: string, options: EndpointOptions): Endpoint;
}

/**
 * endpoint factory resolver.
 */
export abstract class EndpointFactoryResolver {
    /**
     * resolve endpoint.
     */
    abstract resolve<T>(type: Type<T> | Class<T>, injector: Injector): EndpointFactory<T>;
}
