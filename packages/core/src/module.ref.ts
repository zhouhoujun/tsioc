import {
    Abstract, Destroyable, DestroyCallback, Injector, ModuleWithProviders, Type,
    isFunction, isPlainObject, lang, ModuleReflect, OnDestroy, OperationFactoryResolver,
    ModuleRef as ModRef
} from '@tsdi/ioc';
import { ModuleLifecycleHooks } from './lifecycle';
import { RunnableFactoryResolver } from './runnable';


/**
 * Represents an instance of an `Module` created by an `ModuleFactory`.
 * Provides access to the `Module` instance and related objects.
 *
 * @publicApi
 */
@Abstract()
export abstract class ModuleRef<T = any> extends Injector implements ModRef<T>, Destroyable, OnDestroy {
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
     * operaton factory resolver.
     */
    abstract get operationFactoryResolver(): OperationFactoryResolver;
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
     * import module.
     * @param modle 
     */
    abstract import<M>(modle: Type<M> | ModuleWithProviders<M>): void;
    /**
     * destroy.
     */
    abstract destroy(): void | Promise<void>;
    /**
     * destroy hook.
     */
    abstract onDestroy(): void;
    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    abstract onDestroy(callback: DestroyCallback): void
}


export function getModuleType(input: any[]): (Type | ModuleWithProviders)[] {
    const types: (Type | ModuleWithProviders)[] = [];
    lang.deepForEach<Type | ModuleWithProviders>(input, ty => {
        if (isFunction(ty) || (ty as ModuleWithProviders).module) {
            types.push(ty);
        }
    }, v => isPlainObject(v) && !(v as ModuleWithProviders).module);
    return types;
}
