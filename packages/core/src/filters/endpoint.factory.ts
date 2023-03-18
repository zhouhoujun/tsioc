import { Abstract, Type, Class, ReflectiveRef, Injector } from '@tsdi/ioc';
import { Endpoint } from '../Endpoint';
import { RunnableRef } from '../ApplicationRunners';
import { EndpointOptions } from '../EndpointService';
import { EndpointContext } from './context';
import { Respond } from './filter';



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
