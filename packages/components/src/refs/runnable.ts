import { Abstract, ModuleRef, ReflectiveRef } from '@tsdi/ioc';
import { RunnableFactory, RunnableRef } from '@tsdi/core';
import { ComponentRef } from './component';


/**
 * Component RunnableRef.
 *
 * @export
 * @class ComponentRunnableRef
 */
@Abstract()
export abstract class ComponentRunnableRef<T = any> extends RunnableRef<T> {
    /**
     * component Ref.
     */
    abstract get componentRef(): ComponentRef<T>

}


/**
 * Component Runnable Factory.
 *
 * @export
 * @class ComponentRunnableRef
 */
@Abstract()
export abstract class ComponentRunnableFactory extends RunnableFactory {
    /**
     * runnable factory.
     * @param typeRef 
     */
    abstract create<T>(typeRef: ReflectiveRef<T>, moduleRef?: ModuleRef): ComponentRunnableRef<T>

}
