import { Inject, BindProviderAction, DecoratorScopes, InjectReference, ProviderTypes, ActionRegisterer, DecoratorProvider, DesignRegisterer } from '@tsdi/ioc';
import { IContainer, ContainerToken, IocExt } from '@tsdi/core';
import { HandleRegisterer, BootContext, StartupDecoratorRegisterer, StartupScopes, BootTargetAccessor, AnnoationDesignAction, AnnotationCloner } from '@tsdi/boot';
import { ComponentRegisterAction, BootComponentAccessor, RefSelector, ComponentAnnotationCloner } from '@tsdi/components';
import { Task } from './decorators/Task';
import { RunAspect } from './aop';
import * as core from './core';
import { TaskInjectorRegisterAction, ActivityContext } from './core';
import * as activites from './activities';
import { ActivityRefSelector } from './ActivityRefSelector';
import { TaskDecorSelectorHandle, BindingTaskComponentHandle, ValidTaskComponentHandle } from './handles';


/**
 * setup wokflow activity module for boot application.
 *
 * @export
 * @param {IContainer} container
 */
@IocExt('setup')
export class ActivityModule {
    constructor() {
    }

    setup(@Inject(ContainerToken) container: IContainer) {

        container.getInstance(ActionRegisterer)
            .register(container, TaskInjectorRegisterAction, true);

        container.getInstance(HandleRegisterer)
            .register(container, ValidTaskComponentHandle)
            .register(container, BindingTaskComponentHandle)
            .register(container, TaskDecorSelectorHandle);

        container.getInstance(DecoratorProvider)
            .bindProviders(Task, { provide: BootTargetAccessor, useClass: BootComponentAccessor })


        container.getInstance(DesignRegisterer)
            .register(Task, DecoratorScopes.Class, BindProviderAction, AnnoationDesignAction, ComponentRegisterAction)
            .register(Task, DecoratorScopes.Injector, TaskInjectorRegisterAction);

        container.getInstance(StartupDecoratorRegisterer)
            .register(Task, StartupScopes.TranslateTemplate, TaskDecorSelectorHandle)
            .register(Task, StartupScopes.ValifyComponent, ValidTaskComponentHandle)
            .register(Task, StartupScopes.Binding, BindingTaskComponentHandle);


        container.register(ActivityRefSelector);
        container.getInstance(DecoratorProvider)
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


        container.use(core)
            .use(RunAspect)
            .use(activites);
    }
}
