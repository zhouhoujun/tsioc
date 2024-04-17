import { Destroyable, DestroyCallback, OnDestroy } from './destroy';
import { ModuleWithProviders, ProviderType } from './providers';
import { Injector } from './injector';
import { Abstract } from './metadata/fac';
import { Class } from './metadata/type';
import { ReflectiveFactory } from './reflective';
import { Type, ClassType, Modules } from './types';
import { isType } from './utils/chk';
import { deepForEach } from './utils/lang';
import { isPlainObject } from './utils/obj';


export type ModuleType = Modules | ModuleWithProviders;

/**
 * Represents an instance of an `Module` created by an `ModuleFactory`.
 * Provides access to the `Module` instance and related objects. Default static Injector.
 *
 * 模块类容器, 默认静态容器
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
    abstract get moduleReflect(): Class<T>;
    /**
     * reflectiveRef factory.
     */
    abstract get reflectiveFactory(): ReflectiveFactory;
    /**
     * The injector that contains all of the providers of the `Module`.
     */
    abstract get injector(): Injector;

    abstract get ready(): Promise<void>;
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

export function getModuleType(input: any[]): (ClassType | ModuleWithProviders)[] {
    const types: (ClassType | ModuleWithProviders)[] = [];
    deepForEach<Type | ModuleWithProviders>(input, ty => {
        if (isType(ty) || (ty as ModuleWithProviders).module) {
            types.push(ty as ClassType | ModuleWithProviders)
        }
    }, v => isPlainObject(v) && !(v as ModuleWithProviders).module);
    return types
}
