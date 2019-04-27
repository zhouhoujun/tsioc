import { IContainer, ContainerToken, IocExt, ModuleDecoratorRegisterer, ServiceDecoratorRegisterer } from '@tsdi/core';
import { Task } from './decorators/Task';
import { RunAspect } from './aop';
import * as core from './core';
import * as activites from './activities';
import { Inject, BindProviderAction, DesignDecoratorRegisterer, DecoratorScopes } from '@tsdi/ioc';
import { ModuleBuildDecoratorRegisterer, DIModuleRegisterScope } from '@tsdi/boot';
import { RegSelectorAction, TaskDecoratorServiceAction, BindInputPropertyTypeAction } from './core';
import { Input } from './decorators';
import { ActivityBuildHandle } from './handles';


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
        container.registerSingleton(BindInputPropertyTypeAction, () => new BindInputPropertyTypeAction(container));

        container.get(DesignDecoratorRegisterer).register(Task, DecoratorScopes.Class,
            BindProviderAction, RegSelectorAction);
        container.get(DesignDecoratorRegisterer).register(Input, DecoratorScopes.Property,
            BindInputPropertyTypeAction);

        container.get(ModuleDecoratorRegisterer).register(Task, DIModuleRegisterScope);
        container.get(ModuleBuildDecoratorRegisterer).register(Task, ActivityBuildHandle);

        container.use(core)
            .use(ActivityBuildHandle)
            .use(RunAspect)
            .use(activites);

        container.get(ServiceDecoratorRegisterer).register(Task, TaskDecoratorServiceAction);
    }
}
