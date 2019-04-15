import { IContainer, ContainerToken, IocExt } from '@tsdi/core';
import { Task } from './decorators/Task';
import { RunAspect } from './aop';
import * as core from './core';
import * as activites from './activities';
import { Inject, BindProviderAction, DesignDecoratorRegisterer, DecoratorScopes } from '@tsdi/ioc';
import { RegSelectorAction } from './core/RegSelectorAction';
import { ModuleBuildDecoratorRegisterer } from '@tsdi/boot';
import { ActivityBuildHandle } from './core';

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
        let decReg = container.get(DesignDecoratorRegisterer);
        decReg.register(Task, DecoratorScopes.Class, BindProviderAction, RegSelectorAction);

        container.get(ModuleBuildDecoratorRegisterer).register(Task, ActivityBuildHandle);

        container.use(core)
            .use(RunAspect)
            .use(activites);
    }
}
