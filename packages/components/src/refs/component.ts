import { Abstract, Injectable, Injector, InvokeArguments, isFunction, lang, refl, Type, TypeDef } from '@tsdi/ioc';
import { DefaultRunnableFactory, DefaultRunnableRef, ModuleRef, RunnableFactory, RunnableFactoryResolver, RunnableRef } from '@tsdi/core';
import { ChangeDetectorRef } from '../chage/detector';
import { ElementRef } from './element';
import { ViewRef } from './view';
import { ComponentDef } from '../type';
import { ComponentState } from '../state';


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
     * component def.
     */
    abstract get def(): TypeDef<T>;
    /**
     * create compontent ref.
     * @param type
     * @param option 
     */
    abstract create(injector: Injector): ComponentRef<T>;
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
    abstract resolve<T>(type: Type<T> | TypeDef<T>): ComponentFactory<T>;
}

/**
 * Component RunnableRef.
 *
 * @export
 * @class ComponentRunnableRef
 */
export class ComponentRunnableRef<T = any> extends DefaultRunnableRef<T> {

    private _compRef?: ComponentRef<T>;
    get componentRef(): ComponentRef<T> {
        if (!this._compRef) {
            this._compRef = this.injector.get(ComponentFactoryResolver).resolve(this.def).create(this.injector);
        }
        return this._compRef;
    }

    override run(): any {
        return this.injector.get(ComponentState).run(this.componentRef);
    }

    protected override createInstance(): T {
        return this.componentRef.instance;
    }

}

export class ComponentRunnableFactory<T = any> extends DefaultRunnableFactory<T> {

    protected createInstance(def: TypeDef<T> | TypeDef<T>, injector: Injector, options?: InvokeArguments, invokeMethod?: string): RunnableRef<T> {
        return new ComponentRunnableRef(def, injector, options, invokeMethod)
    }

}


@Injectable()
export class ComponentRunnableFactoryResolver extends RunnableFactoryResolver {
    constructor(private moduleRef?: ModuleRef) {
        super()
    }

    resolve<T>(type: Type<T> | TypeDef<T>): RunnableFactory<T> {
        return new ComponentRunnableFactory(isFunction(type) ? refl.get(type) : type, this.moduleRef);
    }

}