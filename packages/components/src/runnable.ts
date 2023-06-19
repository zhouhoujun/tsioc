import { Injectable, Injector, InvokeArguments, TypeDef } from '@tsdi/ioc';
import {RunnableRef } from '@tsdi/core';
import { ComponentState } from './state';
import { ComponentRef } from './refs/component';
import { ViewContainerRef } from './refs/container';


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
            this._compRef = this.injector.get(ViewContainerRef).createComponent(this.class, {
                injector: this.injector,
                context: this.context,
                moduleRef: this.moduleRef
            });
        }
        return this._compRef;
    }

    override run(): any {
        return this.injector.get(ComponentState).bootstrap(this.componentRef);
    }

    protected override createInstance(): T {
        return this.componentRef.instance;
    }

}

@Injectable()
export class ComponentRunnableFactory<T = any> extends DefaultRunnableFactory<T> {

    protected createInstance(def: TypeDef<T>, injector: Injector, options?: InvokeArguments, invokeMethod?: string): RunnableRef<T> {
        return new ComponentRunnableRef(def, injector, this.moduleRef, options, invokeMethod)
    }

}
