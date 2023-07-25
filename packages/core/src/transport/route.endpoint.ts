import { Abstract, Class, DestroyCallback, Destroyable, Injector, OnDestroy, ReflectiveRef, Token, Type } from '@tsdi/ioc';
import { Pattern } from '@tsdi/common';
import { OperationEndpoint } from '../endpoints/endpoint.factory';
import { EndpointOptions } from '../endpoints/endpoint.service';


/**
 * Opteration Endpoint
 */
export abstract class RouteEndpoint extends OperationEndpoint {

    abstract get options(): RouteEndpointOptions;
    /**
     * invoker.
     */
    abstract get prefix(): string
}

/**
 * Route endpoint options.
 */
export interface RouteEndpointOptions<T = any> extends EndpointOptions<T> {
    /**
     * route
     */
    route?: Pattern;
    /**
     * route prefix
     */
    prefix?: string;
    /**
     * dynamic tokens for path of topic.  
     */
    paths?: Record<string, Token>;
}

/**
 * route endpoint factory.
 */
@Abstract()
export abstract class RouteEndpointFactory<T> implements OnDestroy, Destroyable {
    /**
     * type ref.
     */
    abstract get typeRef(): ReflectiveRef<T>;
    /**
     * create route endpoint.
     * @param propertyKey 
     * @param options 
     */
    abstract create<TArg>(propertyKey: string, options: RouteEndpointOptions<TArg>): RouteEndpoint;

    
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

