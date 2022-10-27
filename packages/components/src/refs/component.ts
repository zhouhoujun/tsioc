import { Abstract, Injector, Type } from '@tsdi/ioc';
import { ChangeDetectorRef } from '../chage/detector';
import { ElementRef } from './element';
import { ViewRef } from './view';
import { ComponentDef } from '../type';


/**
 * Represents a component created by a `ComponentFactory`.
 * Provides access to the component instance and related objects,
 * and provides the means of destroying the instance.
 *
 * @publicApi
 */
@Abstract()
export abstract class ComponentRef<C = any> {
    /**
     * component type.
     */
    abstract get type(): Type<C>;
    /**
    * get target def.
    */
    abstract get def(): ComponentDef<C>;

    /**
     * Updates a specified input name to a new value. Using this method will properly mark for check
     * component using the `OnPush` change detection strategy. It will also assure that the
     * `OnChanges` lifecycle hook runs when a dynamically created component is change-detected.
     *
     * @param name The name of an input.
     * @param value The new value of an input.
     */
    abstract setInput(name: string, value: unknown): void;

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
    * destroy this.
    */
    abstract destroy(): void;

    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    abstract onDestroy(callback: () => void): void;
}
