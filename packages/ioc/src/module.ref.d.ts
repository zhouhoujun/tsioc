import { Destroyable, DestroyCallback, OnDestroy } from './destroy';
import { ModuleType, ModuleWithProviders, Provider } from './providers';
import { Injector } from './injector';
import { ClassRef } from './metadata/class';
import { Type } from './types';
/**
 * Represents an instance of an `Module` created by an `ModuleFactory`.
 * Provides access to the `Module` instance and related objects. Default static Injector.
 *
 * 模块类容器, 默认静态容器
 *
 * @publicApi
 */
export declare abstract class ModuleRef<T = any> extends Injector implements Destroyable, OnDestroy {
    /**
     * module type
     */
    abstract get moduleType(): Type<T>;
    /**
     * module type
     */
    abstract get moduleReflect(): ClassRef<T>;
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
    abstract import<M>(modle: Type<M> | ModuleWithProviders<M>, children?: boolean): void | Promise<void>;
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
    abstract onDestroy(callback: DestroyCallback): void;
}
/**
 * module option.
 */
export interface ModuleOption {
    /**
     *  providers.
     */
    providers?: Provider[];
    /**
     * dependence modules. register before module injector init.
     */
    deps?: ModuleType<Type>[];
    /**
     * moduel scope.
     */
    scope?: 'root' | string;
    /**
     * is static or not.
     */
    isStatic?: boolean;
}
export declare function getModuleType(input: any[]): (Type | ModuleWithProviders)[];
