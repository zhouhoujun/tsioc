import { Abstract, Type, Class, ReflectiveRef, Injector, OperationInvoker, OnDestroy, Destroyable, DestroyCallback } from '@tsdi/ioc';
import { EndpointOptions } from './endpoint.service';
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
 * endpoint factory.
 */
@Abstract()
export abstract class EndpointFactory<T> implements OnDestroy, Destroyable {

    abstract get typeRef(): ReflectiveRef<T>;

    abstract create<TArg>(propertyKey: string, options: EndpointOptions<TArg>): OperationEndpoint;

    
    destroy(): void {
        this.typeRef.destroy();
    }
    get destroyed(): boolean {
        return this.typeRef.destroyed;
    }
    
    onDestroy(callback?: DestroyCallback): void {
        this.typeRef.onDestroy(callback);
    }
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


