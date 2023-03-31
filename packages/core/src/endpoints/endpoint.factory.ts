import { Abstract, Type, Class, ReflectiveRef, Injector, OperationInvoker } from '@tsdi/ioc';
import { RunnableRef } from '../ApplicationRunners';
import { EndpointOptions } from '../EndpointService';
import { EndpointContext } from './context';
import { Endpoint } from './endpoint';

/**
 * Opteration Endpoint
 */
export abstract class OperationEndpoint extends Endpoint {
    /**
     * invoker.
     */
    abstract get invoker(): OperationInvoker
}


/**
 * bootstrap option for {@link RunnableRef}.
 */
export interface BootstrapOption<T = any> extends EndpointOptions<T> {
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

    abstract create<TArg>(propertyKey: string, options: BootstrapOption<TArg>): OperationEndpoint;
}

/**
 * endpoint factory resolver.
 */
@Abstract()
export abstract class EndpointFactoryResolver {
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(type: ReflectiveRef<T>): EndpointFactory<T>;
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(type: Type<T> | Class<T>, injector: Injector): EndpointFactory<T>;
}



@Abstract()
export abstract class Respond {

    /**
     * respond with execption handled data.
     * @param ctx transport context. instance of {@link ServerEndpointContext}.
     * @param value execption handled returnning value
     */
    abstract respond<T>(ctx: EndpointContext, value: T): void;
}

/**
 * Execption respond adapter with response type.
 */
@Abstract()
export abstract class TypedRespond {
    /**
     * respond with execption handled data.
     * @param ctx transport context. instance of {@link ServerEndpointContext}.
     * @param responseType response type
     * @param value execption handled returnning value
     */
    abstract respond<T>(ctx: EndpointContext, responseType: 'body' | 'header' | 'response', value: T): void;
}

