import { IContainer, ContainerToken, IocExt, ModuleDecoratorRegisterer, ServiceDecoratorRegisterer } from '@tsdi/core';
import { Task } from './decorators/Task';
import { RunAspect } from './aop';
import * as core from './core';
import * as activites from './activities';
import { Inject, BindProviderAction, DesignDecoratorRegisterer, DecoratorScopes } from '@tsdi/ioc';
import { DIModuleRegisterScope, ComponentRegisterAction, TemplateDecoratorRegisterer, HandleRegisterer, BindingComponentDecoratorRegisterer } from '@tsdi/boot';
import { TaskDecoratorServiceAction } from './core';
import { TaskDecorSelectorHandle, BindingTaskTemplateHandle } from './handles';



/**
 * register task decorators.
 *
 * @export
 * @param {IContainer} container
 */
@IocExt('setup')
export class CoreModule {
    constructor(@Inject(ContainerToken) private container: IContainer) {
    }

    setup() {
        let container = this.container;

        container.getActionRegisterer()
            .register(container, TaskDecoratorServiceAction);

        container.get(HandleRegisterer)
            .register(container, BindingTaskTemplateHandle)
            .register(container, TaskDecorSelectorHandle);


        container.get(DesignDecoratorRegisterer).register(Task, DecoratorScopes.Class,
            BindProviderAction, ComponentRegisterAction);


        container.get(ModuleDecoratorRegisterer).register(Task, DIModuleRegisterScope);
        container.get(TemplateDecoratorRegisterer).register(Task, TaskDecorSelectorHandle);
        container.get(BindingComponentDecoratorRegisterer).register(Task, BindingTaskTemplateHandle);

        container.use(core)
            .use(RunAspect)
            .use(activites);

        container.get(ServiceDecoratorRegisterer).register(Task, TaskDecoratorServiceAction);
    }
}
