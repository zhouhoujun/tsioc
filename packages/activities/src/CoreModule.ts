import { IContainer, ContainerToken, IocExt } from '@tsdi/core';
import { Task } from './decorators/Task';
import { RunAspect } from './aop';
import * as core from './core';
import * as activites from './activities';
import { Inject, BindProviderAction, DesignDecoratorRegisterer, DecoratorScopes } from '@tsdi/ioc';
import { RegSelectorAction } from './core/RegSelectorAction';

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
        let decReg = container.resolve(DesignDecoratorRegisterer);
        decReg.register(Task, DecoratorScopes.Class, BindProviderAction, RegSelectorAction);

        container.use(core)
            .use(RunAspect)
            .use(activites);
    }
}
