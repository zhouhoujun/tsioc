import { IContainer, ContainerToken } from '@ts-ioc/core';
import { Task } from './decorators/Task';
import { RunAspect } from './aop';
import { InputDataToken } from './core';
import * as core from './core';
import * as injectors from './injectors';
import * as activites from './activities';
import { IocExt, Inject, DecoratorRegisterer, BindProviderAction } from '@ts-ioc/ioc';

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
        let decReg = container.resolve(DecoratorRegisterer);
        decReg.register(Task, BindProviderAction);

        container.bindProvider(InputDataToken, null);
        container.use(core)
            .use(injectors)
            .use(RunAspect)
            .use(activites);
    }
}
