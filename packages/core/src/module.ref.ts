import {
    Abstract, Destroyable, DestroyCallback, Injector, InjectorTypeWithProviders,
    isFunction, isPlainObject, lang, ModuleReflect, Type
} from '@tsdi/ioc';
import { RunnableFactoryResolver } from './runnable';


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

    // /**
    //  * factory resolver.
    //  */
    // abstract get factoryResolver():  ResolverFactoryResolver;

    /**
     * runnable factory resolver.
     */
    abstract get runnableFactoryResolver():  RunnableFactoryResolver;


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
