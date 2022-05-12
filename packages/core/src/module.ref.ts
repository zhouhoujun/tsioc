import {
    Abstract, Destroyable, DestroyCallback, Injector, ModuleWithProviders, Type,
    isFunction, isPlainObject, lang, ModuleReflect, OnDestroy, ReflectiveResolver,
    ModuleRef as ModRef, Modules
} from '@tsdi/ioc';
import { ModuleLifecycleHooks } from './lifecycle';
import { RunnableFactoryResolver } from './runnable';


export type ModuleType = Modules | ModuleWithProviders;

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
     * reflective resolver.
     */
    abstract get reflectiveResolver(): ReflectiveResolver;
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
     * @param children import as children or not. 
     */
    abstract import<M>(modle: Type<M> | ModuleWithProviders<M>, children?: boolean): void;
    /**
     * use modules.
     * @param modules 
     */
    abstract use(modules: ModuleType[]): Type[];
    /**
     * use modules.
     * @param modules 
     */
    abstract use(...modules: ModuleType[]): Type[];
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
