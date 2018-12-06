import { IContainer, CoreActions, Inject, ContainerToken, IocExt, MetaAccessorToken } from '@ts-ioc/core';
import { Task, Workflow } from './decorators';
import { RunAspect } from './aop';
import * as injectors from './injectors';
import * as activites from './activities';
import * as core from './core';
import { InputDataToken } from './core';
import { ActivityMetaAccessorToken } from './injectors';
import { ApplicationBuilderToken } from '@ts-ioc/bootstrap';
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
        lifeScope.registerDecorator(Workflow, CoreActions.bindProvider, CoreActions.cache, CoreActions.componentBeforeInit, CoreActions.componentInit, CoreActions.componentAfterInit);
        lifeScope.registerDecorator(Task, CoreActions.bindProvider, CoreActions.cache, CoreActions.componentBeforeInit, CoreActions.componentInit, CoreActions.componentAfterInit);

        container.bindProvider(InputDataToken, null);
        // container.bindTarget(ApplicationBuilderToken, [
        //     { provide: MetaAccessorToken, useExisting: ActivityMetaAccessorToken }
        // ]);
        // container.bindRefProvider(ApplicationBuilderToken, MetaAccessorToken, ActivityMetaAccessorToken);
        container.use(injectors)
            .use(core)
            .use(RunAspect)
            .use(activites);
    }
}
