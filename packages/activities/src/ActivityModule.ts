import {
    Inject, BindProviderAction, DecoratorScopes,
    DecoratorProvider, DesignRegisterer, IocExt
} from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { BootContext, StartupDecoratorRegisterer, StartupScopes, AnnoationDesignAction, AnnotationCloner, BuildContext } from '@tsdi/boot';
import { ComponentRegisterAction, ComponentProvider, ComponentAnnotationCloner, ComponentSelectorHandle, AstResolver, DefaultComponets, ELEMENT_REF, TEMPLATE_REF, COMPONENT_REF, BindingsCache, Input, Output, RefChild, Vaildate } from '@tsdi/components';
import { Task } from './decorators/Task';
import { RunAspect } from './aop/RunAspect';
import * as activites from './activities';
import { ActivityProvider } from './ActivityProvider';
import { ActivityContext } from './core/ActivityContext';
import { ActivityExecutor } from './core/ActivityExecutor';
import { WorkflowInstance, WorkflowContext } from './core/WorkflowInstance';
import { ActivityDepsRegister } from './registers/ActivityDepsRegister';
import { ActivityElementRef, ActivityTemplateRef, ActivityComponentRef } from './core/ActivityRef';


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

        let actInjector = container.getActionInjector();

        actInjector.getInstance(DesignRegisterer)
            .register(Task, DecoratorScopes.Class, BindProviderAction, AnnoationDesignAction, ComponentRegisterAction, ActivityDepsRegister);

        actInjector.regAction(ComponentSelectorHandle);
        actInjector.getInstance(StartupDecoratorRegisterer)
            .register(Task, StartupScopes.TranslateTemplate, ComponentSelectorHandle);

        container.inject(WorkflowContext, ActivityContext, ActivityExecutor, WorkflowInstance, RunAspect);

        actInjector.getSingleton(DefaultComponets).push('@Task');

        actInjector.getInstance(DecoratorProvider)
            .bindProviders(Task,
                { provide: BootContext, useClass: WorkflowContext },
                { provide: BuildContext, useClass: ActivityContext },
                { provide: AstResolver, useFactory: (prd) => new AstResolver(prd), deps: [ComponentProvider] },
                { provide: ComponentProvider, useClass: ActivityProvider },
                { provide: ELEMENT_REF, useClass: ActivityElementRef },
                { provide: TEMPLATE_REF, useClass: ActivityTemplateRef },
                { provide: COMPONENT_REF, useClass: ActivityComponentRef },
                { provide: AnnotationCloner, useClass: ComponentAnnotationCloner },
                { provide: BindingsCache, useFactory: () => new BindingsCache()
                    .register(Input)
                    .register(Output)
                    .register(RefChild)
                    .register(Vaildate) }
            );


        container.use(activites);
    }
}
