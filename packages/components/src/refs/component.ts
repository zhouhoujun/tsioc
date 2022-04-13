import { Abstract, Injector, lang, Type } from '@tsdi/ioc';
import { RunnableFactory, BootstrapOption, RunnableFactoryResolver, ApplicationContext, Runnable, RunnableRef } from '@tsdi/core';
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
export abstract class ComponentRef<C = any> implements RunnableRef<C> {
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

    /**
     * runable interface.
     * @param context 
     * @returns 
     */
    run(context?: ApplicationContext) {
        if (context) {
            this.onDestroy(() => {
                lang.remove(context.runners.bootstraps, this);
            });
            context.runners.bootstraps.push(this);
        }
        this.render();
    }

    /**
     * render the component.
     */
    abstract render(): void;

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
export abstract class ComponentFactory<T> extends RunnableFactory<T> {
    /**
     * create compontent ref.
     * @param type
     * @param option 
     */
    abstract create(injector: Injector, option: BootstrapOption): ComponentRef<T>;
}

@Abstract()
export abstract class ComponentFactoryResolver extends RunnableFactoryResolver {

    /**
     * resolve component factory.
     * @param type 
     */
    abstract resolve<T>(type: Type<T>): ComponentFactory<T>;
}