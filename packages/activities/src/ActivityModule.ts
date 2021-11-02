import { Inject, IocExt, Injector } from '@tsdi/ioc';
import { RunAspect } from './aop/RunAspect';
import * as activites from './activities';
import { ActivityContext } from './core/ActivityContext';
import { ActivityExecutor } from './core/ActivityExecutor';
import { WorkflowInstance, WorkflowContext } from './core/WorkflowContext';



/**
 * setup wokflow activity module for boot application.
 *
 * @export
 * @param {IContainer} container
 */
@IocExt()
export class ActivityModule {

    setup(@Inject() injector: Injector) {

        // actInjector.regAction(ComponentSelectorHandle);
        // actInjector.getInstance(StartupDecoratorRegisterer)
        //     .register(Task, 'TranslateTemplate', ComponentSelectorHandle);

        injector.inject(WorkflowContext, ActivityContext, ActivityExecutor, WorkflowInstance, RunAspect);

        // actInjector.getValue(DefaultComponets).push('@Task');

        // actInjector.getInstance(DecoratorProvider)
        //     .bindProviders(Task,
        //         ControlActivityElementRef,
        //         { provide: BootContext, useClass: WorkflowContext },
        //         { provide: BuildContext, useClass: ActivityContext },
        //         { provide: AstResolver, useFactory: (prd) => new AstResolver(prd), deps: [ComponentProvider] },
        //         { provide: ComponentProvider, useClass: ActivityProvider },
        //         { provide: ELEMENT_REF, useClass: ActivityElementRef },
        //         { provide: TEMPLATE_REF, useClass: ActivityTemplateRef },
        //         { provide: COMPONENT_REF, useClass: ActivityComponentRef },
        //         {
        //             provide: BindingsCache,
        //             useFactory: () => new BindingsCache()
        //                 .register(Input)
        //                 .register(Output)
        //                 .register(RefChild)
        //                 .register(Vaildate)
        //         }
        //     );


        injector.use(activites);
    }
}
