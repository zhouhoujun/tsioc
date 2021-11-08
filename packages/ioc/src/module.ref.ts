import { Destroyable } from './destroy';
import { Type } from './types';
import { Abstract } from './metadata/fac';
import { Injector, Registered } from './injector';
import { InjectorTypeWithProviders } from './providers';
import { deepForEach } from './utils/lang';
import { ModuleReflect } from './metadata/type';
import { isFunction, isPlainObject } from './utils/chk';

/**
 * Represents an instance of an `Module` created by an `ModuleFactory`.
 * Provides access to the `Module` instance and related objects.
 *
 * @publicApi
 */
@Abstract()
export abstract class ModuleRef<T = any> extends Injector implements Destroyable {
    /**
     * module type
     */
    abstract get moduleType(): Type<T>;
    /**
     * module type
     */
    abstract get moduleReflect(): ModuleReflect<T>;
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
    abstract destroy(): void;
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    abstract onDestroy(callback: () => void): void
}

/**
 * module registered state.
 */
export interface ModuleRegistered extends Registered {
    moduleRef?: ModuleRef;
}


export function getModuleType(input: any[]): (Type | InjectorTypeWithProviders)[] {
    const types: (Type | InjectorTypeWithProviders)[] = [];
    deepForEach<Type | InjectorTypeWithProviders>(input, ty => {
        if (isFunction(ty) || (ty as InjectorTypeWithProviders).module) {
            types.push(ty);
        }
    }, v => isPlainObject(v) && !(v as InjectorTypeWithProviders).module);
    return types;
}
