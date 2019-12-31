import {
    Inject, BindProviderAction, DecoratorScopes, InjectReference, ProviderTypes,
    DecoratorProvider, DesignRegisterer, ActionInjectorToken, IocExt
} from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { BootContext, StartupDecoratorRegisterer, StartupScopes, AnnoationDesignAction, AnnotationCloner } from '@tsdi/boot';
import { ComponentRegisterAction, RefSelector, ComponentAnnotationCloner, ComponentSelectorHandle } from '@tsdi/components';
import { Task } from './decorators/Task';
import { RunAspect } from './aop';
import * as activites from './activities';
import { ActivityRefSelector } from './ActivityRefSelector';
import { ActivityContext } from './core/ActivityContext';
import { ActivityExecutor } from './core/ActivityExecutor';
import { ActivityResult } from './core/ActivityResult';
import { ActivityStatus } from './core/ActivityStatus';
import { CompoiseActivity } from './core/CompoiseActivity';
import { WorkflowInstance } from './core/WorkflowInstance';
import { ActivityDepsRegister } from './registers/ActivityDepsRegister';


/**
 * setup wokflow activity module for boot application.
 *
 * @export
 * @param {IContainer} container
 */
@IocExt()
export class ActivityModule {
    constructor() {
    }

    setup(@Inject(ContainerToken) container: IContainer) {

        let actInjector = container.get(ActionInjectorToken);

        actInjector.regAction(ActivityDepsRegister);

        actInjector.getInstance(DesignRegisterer)
            .register(Task, DecoratorScopes.Class, BindProviderAction, AnnoationDesignAction, ComponentRegisterAction, ActivityDepsRegister);

        container.getInstance(StartupDecoratorRegisterer)
            .register(Task, StartupScopes.TranslateTemplate, ComponentSelectorHandle);


        actInjector.getInstance(DecoratorProvider)
            .bindProviders(Task,
                {
                    provide: BootContext,
                    deps: [ContainerToken],
                    useFactory: (container: IContainer, ...providers: ProviderTypes[]) => {
                        let ref = new InjectReference(BootContext, Task.toString());
                        if (container.has(ref)) {
                            return container.get(ref, ...providers);
                        } else {
                            return container.getInstance(ActivityContext, ...providers);
                        }
                    }
                },
                { provide: RefSelector, useClass: ActivityRefSelector },
                { provide: AnnotationCloner, useClass: ComponentAnnotationCloner }
            );


        container.inject(ActivityContext, ActivityExecutor, ActivityResult, ActivityStatus, CompoiseActivity, WorkflowInstance)
            .register(RunAspect)
            .use(activites);
    }
}
