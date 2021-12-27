import {
    Abstract, Destroyable, DestroyCallback, Injector, InjectorTypeWithProviders, Type,
    isFunction, isPlainObject, lang, ModuleReflect, OnDestroy, OperationFactoryResolver
} from '@tsdi/ioc';
import { ModuleLifecycleHooks } from './lifecycle';
import { MiddlewareRefFactoryResolver } from './middlewares/middleware';
import { RouteRefFactoryResolver } from './middlewares/route';
import { RunnableFactoryResolver } from './runnable';


/**
 * Represents an instance of an `Module` created by an `ModuleFactory`.
 * Provides access to the `Module` instance and related objects.
 *
 * @publicApi
 */
@Abstract()
export abstract class ModuleRef<T = any> extends Injector implements Destroyable, OnDestroy {
    /**
     * module type
     */
    abstract get moduleType(): Type<T>;
    /**
     * module type
     */
    abstract get moduleReflect(): ModuleReflect<T>;
    /**
     * shudown handlers.
     *
     * @readonly
     * @abstract
     * @type {LifecycleHooks}
     */
    abstract get lifecycle(): ModuleLifecycleHooks;
    /**
     * operation factory resolver.
     */
    abstract get operationFactoryResolver(): OperationFactoryResolver;
    /**
     * middleware factory resolver.
     */
    abstract get middleRefFactoryResolver(): MiddlewareRefFactoryResolver;
    /**
     * route factory resolver.
     */
    abstract get routeRefFactoryResolver(): RouteRefFactoryResolver;
    /**
     * runnable factory resolver.
     */
    abstract get runnableFactoryResolver(): RunnableFactoryResolver;
    /**
     * The injector that contains all of the providers of the `Module`.
     */
    abstract get injector(): Injector;
    /**
     * the modle instance.
     */
    abstract get instance(): T;
    /**
     * destory.
     */
    abstract destroy(): void | Promise<void>;
    /**
     * destroy hook.
     */
    abstract onDestroy(): void;
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    abstract onDestroy(callback: DestroyCallback): void
}


export function getModuleType(input: any[]): (Type | InjectorTypeWithProviders)[] {
    const types: (Type | InjectorTypeWithProviders)[] = [];
    lang.deepForEach<Type | InjectorTypeWithProviders>(input, ty => {
        if (isFunction(ty) || (ty as InjectorTypeWithProviders).module) {
            types.push(ty);
        }
    }, v => isPlainObject(v) && !(v as InjectorTypeWithProviders).module);
    return types;
}
