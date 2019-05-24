import { Task } from './decorators/Task';
import { RunAspect } from './aop';
import * as core from './core';
import * as activites from './activities';
import { IContainer, ContainerToken, IocExt, InjectorDecoratorRegisterer, ServiceDecoratorRegisterer } from '@tsdi/core';
import { Inject, BindProviderAction, DesignDecoratorRegisterer, DecoratorScopes } from '@tsdi/ioc';
import { ComponentRegisterAction, ElementDecoratorRegisterer, BuildHandleRegisterer, BindingComponentRegisterer, ValidComponentRegisterer } from '@tsdi/boot';
import { TaskDecoratorServiceAction, TaskInjectorRegisterAction } from './core';
import { TaskDecorSelectorHandle, BindingTaskComponentHandle, ValidTaskComponentHandle } from './handles';


/**
 * register task decorators.
 *
 * @export
 * @param {IContainer} container
 */
@IocExt('setup')
export class ActivityCoreModule {
    constructor(@Inject(ContainerToken) private container: IContainer) {
    }

    setup() {
        let container = this.container;

        container.getActionRegisterer()
            .register(container, TaskDecoratorServiceAction)
            .register(container, TaskInjectorRegisterAction, true);

        container.get(BuildHandleRegisterer)
            .register(container, ValidTaskComponentHandle)
            .register(container, BindingTaskComponentHandle)
            .register(container, TaskDecorSelectorHandle);


        container.get(DesignDecoratorRegisterer).register(Task, DecoratorScopes.Class,
            BindProviderAction, ComponentRegisterAction);


        container.get(InjectorDecoratorRegisterer).register(Task, TaskInjectorRegisterAction);
        container.get(ElementDecoratorRegisterer).register(Task, TaskDecorSelectorHandle);
        container.get(ValidComponentRegisterer).register(Task, ValidTaskComponentHandle);
        container.get(BindingComponentRegisterer).register(Task, BindingTaskComponentHandle);

        container.use(core)
            .use(RunAspect)
            .use(activites);

        container.get(ServiceDecoratorRegisterer).register(Task, TaskDecoratorServiceAction);
    }
}
