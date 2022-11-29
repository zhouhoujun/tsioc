import {
    Abstract, Destroyable, DestroyCallback, Injector, ModuleWithProviders, Type,
    isFunction, isPlainObject, lang, ModuleDef, OnDestroy, ReflectiveFactory,
    ModuleRef as ModRef, Modules, ProviderType, Class
} from '@tsdi/ioc';
import { ModuleLifecycleHooks } from './lifecycle';
import { RunnableFactory } from './runnable';


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
    abstract get moduleReflect(): Class<T>;
    /**
     * shudown handlers.
     * @readonly
     * @abstract
     * @type {LifecycleHooks}
     */
    abstract get lifecycle(): ModuleLifecycleHooks;
    /**
     * reflective factory.
     */
    abstract get reflectiveFactory(): ReflectiveFactory;
    /**
     * runnable factory.
     */
    abstract get runnableFactory(): RunnableFactory;
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


/**
 * module option.
 */
export interface ModuleOption {
    /**
     *  providers.
     */
    providers?: ProviderType[];
    /**
     * dependence modules. register before module injector init.
     */
    deps?: ModuleType[];
    /**
     * register modules after module injector inited.
     */
    uses?: ModuleType[];
    /**
     * moduel scope.
     */
    scope?: 'root' | string;

    /**
     * is static or not.
     */
    isStatic?: boolean;

}

export function getModuleType(input: any[]): (Type | ModuleWithProviders)[] {
    const types: (Type | ModuleWithProviders)[] = [];
    lang.deepForEach<Type | ModuleWithProviders>(input, ty => {
        if (isFunction(ty) || (ty as ModuleWithProviders).module) {
            types.push(ty)
        }
    }, v => isPlainObject(v) && !(v as ModuleWithProviders).module);
    return types
}
