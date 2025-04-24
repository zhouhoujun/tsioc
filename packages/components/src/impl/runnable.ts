import { Injectable, InvocationContext, ModuleRef, ReflectiveRef } from '@tsdi/ioc';
import { ComponentState } from '../state';
import { ComponentRef } from '../refs/component';
import { ViewContainerRef } from '../refs/container';
import { ComponentRunnableFactory, ComponentRunnableRef } from '../refs/runnable';
import { ShellActivity } from '@tsdi/pack';



/**
 * Component RunnableRef.
 *
 * @export
 * @class ComponentRunnableRef
 */
export class ComponentRunnableRefImpl<T = any> extends ComponentRunnableRef<T> {
    get typeRef(): ReflectiveRef<T> {
        return this.componentRef;
    }

    constructor(readonly componentRef: ComponentRef<T>, private moduleRef?: ModuleRef) {
        super()
    }

    override invoke(context: InvocationContext<any>) {
        return this.componentRef.render();
    }

}

@Injectable()
export class ComponentRunnableFactoryImpl extends ComponentRunnableFactory {

    create<T>(componentRef: ComponentRef<T>, moduleRef?: ModuleRef): ComponentRunnableRef<T> {
        return new ComponentRunnableRefImpl(componentRef, moduleRef)
    }

}