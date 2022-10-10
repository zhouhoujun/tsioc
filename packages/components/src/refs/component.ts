import { Abstract, DefaultReflectiveRef, Injector, ReflectiveRef, Type, TypeReflect } from '@tsdi/ioc';
import { RunnableFactory, BootstrapOption, RunnableFactoryResolver } from '@tsdi/core';
import { ChangeDetectorRef } from '../chage/detector';
import { ElementRef } from './element';
import { ViewRef } from './view';
import { ComponentReflect } from '../reflect';

/**
 * Represents a component created by a `ComponentFactory`.
 * Provides access to the component instance and related objects,
 * and provides the means of destroying the instance.
 *
 * @publicApi
 */
@Abstract()
export abstract class ComponentRef<C = any> extends ReflectiveRef<C> {
    /**
     * component type.
     */
    abstract get type(): Type<C>;
    /**
    * get target reflect.
    */
    abstract get reflect(): ComponentReflect<C>;
    /**
     * The host or anchor element for this component instance.
     */
    abstract get location(): ElementRef;

    /**
     * The dependency injector for this component instance.
     */
    abstract get injector(): Injector;

    /**
     * This component instance.
     */
    abstract get instance(): C;

    /**
     * The host view defined by the template
     * for this component instance.
     */
    abstract get hostView(): ViewRef;

    /**
     * The change detector for this component instance.
     */
    abstract get changeDetectorRef(): ChangeDetectorRef;

    abstract get destroyed(): boolean;
    /**
    * destroy this.
    */
    abstract destroy(): void;

    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    abstract onDestroy(callback: () => void): void;
}

/**
 * component factory.
 */
@Abstract()
export abstract class ComponentFactory<T> {
    /**
     * component reflect.
     */
    abstract get reflect(): TypeReflect<T>;
    /**
     * create compontent ref.
     * @param type
     * @param option 
     */
    abstract create(injector: Injector, option: BootstrapOption): ComponentRef<T>;
}

/**
 * component factory resolver.
 */
@Abstract()
export abstract class ComponentFactoryResolver {

    /**
     * resolve component factory.
     * @param type 
     */
    abstract resolve<T>(type: Type<T>): ComponentFactory<T>;
}