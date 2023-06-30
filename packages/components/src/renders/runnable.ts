import { Injectable, InvocationContext, ModuleRef, ReflectiveRef } from '@tsdi/ioc';
import { ComponentState } from '../state';
import { ComponentRef } from '../refs/component';
import { ViewContainerRef } from '../refs/container';
import { ComponentRunnableFactory, ComponentRunnableRef } from '../refs/runnable';



/**
 * Component RunnableRef.
 *
 * @export
 * @class ComponentRunnableRef
 */
export class ComponentRunnableRefImpl<T = any> extends ComponentRunnableRef<T> {

    constructor(readonly typeRef: ReflectiveRef<T>, private moduleRef?: ModuleRef) {
        super()
    }

    private _compRef?: ComponentRef<T>;
    get componentRef(): ComponentRef<T> {
        if (!this._compRef) {
            const injector = this.typeRef.injector;
            this._compRef = injector.get(ViewContainerRef).createComponent(this.typeRef, {
                moduleRef: this.moduleRef
            });
        }
        return this._compRef;
    }

    override invoke(context: InvocationContext<any>) {
        return this.typeRef.injector.get(ComponentState).bootstrap(this.componentRef);
    }

}

@Injectable()
export class ComponentRunnableFactoryImpl extends ComponentRunnableFactory {

    create<T>(typeRef: ReflectiveRef<T>, moduleRef?: ModuleRef): ComponentRunnableRef<T> {
        return new ComponentRunnableRefImpl(typeRef, moduleRef)
    }

}
