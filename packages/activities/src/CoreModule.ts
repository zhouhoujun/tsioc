import { IContainer, CoreActions, Inject, ContainerToken, IocExt } from '@ts-ioc/core';
import { Task } from './decorators';
import { RunAspect } from './aop';
import * as injectors from './injectors';
import * as activites from './activities';
import * as core from './core';
import { InputDataToken } from './core';

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
        container.use(injectors)
            .use(core)
            .use(RunAspect)
            .use(activites);
    }
}
