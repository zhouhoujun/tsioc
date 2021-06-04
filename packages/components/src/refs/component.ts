import { Abstract, IInjector, Type } from '@tsdi/ioc';
import { BootContext, ServiceFactory, BootstrapOption, ServiceFactoryResolver } from '@tsdi/boot';
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
export abstract class ComponentRef<C = any> extends BootContext<C> {
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
    abstract get injector(): IInjector;

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
    * destory this.
    */
    abstract destroy(): void;

    /**
     * register callback on destory.
     * @param callback destory callback
     */
    abstract onDestroy(callback: () => void): void;
}

/**
 * component factory.
 */
@Abstract()
export abstract class ComponentFactory<T> extends ServiceFactory<T> {
    /**
     * create compontent ref.
     * @param type
     * @param option 
     */
     abstract create(option: BootstrapOption): ComponentRef<T>;
}

@Abstract()
export abstract class ComponentFactoryResolver extends ServiceFactoryResolver {

    abstract resolve<T>(type: Type<T>): ComponentFactory<T>;
}