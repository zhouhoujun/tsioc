import { IContainer, CoreActions, Inject, ContainerToken, IocExt } from '@ts-ioc/core';
import { Task } from './decorators/Task';
import { RunAspect } from './aop';
import { InputDataToken } from './core';
import * as core from './core';
import * as injectors from './injectors';
import * as activites from './activities';

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
        let lifeScope = container.getLifeScope();
        // lifeScope.registerDecorator(Workflow, CoreActions.bindProvider);
        lifeScope.registerDecorator(Task, CoreActions.bindProvider);

        container.bindProvider(InputDataToken, null);
        container.use(core)
            .use(injectors)
            .use(RunAspect)
            .use(activites);
    }
}
