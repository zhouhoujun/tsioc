import { BootOption, BootApplication, BootContext } from '@tsdi/boot';
import { WorkflowId, UUIDToken, RandomUUIDFactory, WorkflowInstance, ActivityContext } from './core';
import { lang, isToken, Type } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { LogModule } from '@tsdi/logs';
import { CoreModule } from './CoreModule';
import { SequenceActivity } from './activities';

/**
 * workflow builder.
 *
 * @export
 * @class Workflow
 * @extends {BootApplication}
 */
export class Workflow extends BootApplication {


    protected onInit(target: Type<any> | BootOption | BootContext) {
        super.onInit(target);
        this.use(AopModule)
            .use(LogModule)
            .use(CoreModule);
    }


    getWorkflow<T extends ActivityContext>(workflowId: string): WorkflowInstance<T> {
        return this.getPools().getRoot().get(workflowId);
    }



    // async createActivity(activity: Active, workflowId?: string): Promise<IWorkflowInstance<any>> {
    //     let boot: Active;
    //     workflowId = workflowId || this.createUUID();

    //     if (isToken(activity)) {
    //         boot = activity;
    //     } else {
    //         boot = activity || {};
    //     }
    //     let env = this.getPools().getRoot();
    //     let options = {};
    //     env.bindProvider(WorkflowId, workflowId);
    //     let runner = await this.bootstrap(boot, options) as IWorkflowInstance<any>;
    //     return runner;
    // }

    async sequence(...activities: Active[]): Promise<IWorkflowInstance<any>> {
        let workflows = (activities.length > 1) ? <SequenceConfigure>{ sequence: activities, activity: SequenceActivity } : lang.first(activities);
        let runner = await this.createActivity(workflows);
        return runner;
    }

    // run(...activities: Active[]): Promise<IWorkflowInstance<any>> {
    //     return this.sequence(...activities);
    // }

    protected createUUID() {
        let container = this.getPools().getRoot();
        if (!container.has(UUIDToken)) {
            container.register(RandomUUIDFactory);
        }
        return container.get(UUIDToken).generate();
    }
}
