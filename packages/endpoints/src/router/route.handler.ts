import { Abstract, Class, DestroyCallback, Destroyable, Injector, OnDestroy, ReflectiveRef, Token, Type } from '@tsdi/ioc';
import { InvocationHandler, InvocationOptions } from '@tsdi/core';
import { Pattern } from '@tsdi/common';


/**
 * Route handler
 */
@Abstract()
export abstract class RouteHandler extends InvocationHandler<any, any, RouteHandlerOptions> {

    abstract options: RouteHandlerOptions;

    /**
     * route prefix.
     */
    abstract get prefix(): string;
}

/**
 * Route handler options.
 */
export interface RouteHandlerOptions<T = any> extends InvocationOptions<T> {
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
 * route handler factory.
 */
@Abstract()
export abstract class RouteHandlerFactory<T> implements OnDestroy, Destroyable {
    /**
     * type ref.
     */
    abstract get typeRef(): ReflectiveRef<T>;
    /**
     * create route handler.
     * @param propertyKey 
     * @param options 
     */
    abstract create<TArg>(propertyKey: string, options: RouteHandlerOptions<TArg>): RouteHandler;

    
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
 * route handler factory resolver.
 */
@Abstract()
export abstract class RouteHandlerFactoryResolver {
    /**
     * resolve handler factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(type: ReflectiveRef<T>): RouteHandlerFactory<T>;
    /**
     * resolve handler factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(type: Type<T> | Class<T>, injector: Injector): RouteHandlerFactory<T>;
}

