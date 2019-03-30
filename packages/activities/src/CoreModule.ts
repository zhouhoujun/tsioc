import { IContainer, ContainerToken, IocExt } from '@tsdi/core';
import { Task } from './decorators/Task';
import { RunAspect } from './aop';
import { InputDataToken } from './core';
import * as core from './core';
import * as injectors from './injectors';
import * as activites from './activities';
import { Inject, DecoratorScopeRegisterer, BindProviderAction } from '@tsdi/ioc';

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
        let decReg = container.resolve(DecoratorScopeRegisterer);
        decReg.register(Task, BindProviderAction);

        container.bindProvider(InputDataToken, null);
        container.use(core)
            .use(injectors)
            .use(RunAspect)
            .use(activites);
    }
}
