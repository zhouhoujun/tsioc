import { IContainer, ContainerToken, IocExt, ModuleDecoratorRegisterer, ServiceDecoratorRegisterer } from '@tsdi/core';
import { Task } from './decorators/Task';
import { RunAspect } from './aop';
import * as core from './core';
import { TaskDecoratorServiceAction } from './resolvers';
import * as activites from './activities';
import { Inject, BindProviderAction, DesignDecoratorRegisterer, DecoratorScopes } from '@tsdi/ioc';
import { ModuleBuildDecoratorRegisterer, DIModuleRegisterScope } from '@tsdi/boot';
import { ActivityBuildHandle, BuildTemplateHandle } from './handles';
import { RegSelectorAction } from './core';


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
        container.registerSingleton(RegSelectorAction, () => new RegSelectorAction(container));
        container.get(DesignDecoratorRegisterer).register(Task, DecoratorScopes.Class, BindProviderAction, RegSelectorAction);
        container.get(ModuleDecoratorRegisterer).register(Task, DIModuleRegisterScope);
        container.get(ModuleBuildDecoratorRegisterer).register(Task, ActivityBuildHandle);

        container.use(core)
            .use(TaskDecoratorServiceAction)
            .use(BuildTemplateHandle, ActivityBuildHandle)
            .use(RunAspect)
            .use(activites);

        container.get(ServiceDecoratorRegisterer).register(Task, TaskDecoratorServiceAction);
    }
}
