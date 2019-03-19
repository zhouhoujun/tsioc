import { ApplicationBuilder, BootOptions, AppConfigure } from '@ts-ioc/boot';
import {
    IActivity, IWorkflowInstance, Active, SequenceConfigure, WorkflowId,
    UUIDToken, RandomUUIDFactory, CoreActivityConfigs
} from './core';
import { IWorkflow } from './IWorkflow';
import { lang, isToken } from '@ts-ioc/ioc';
import { AopModule } from '@ts-ioc/aop';
import { LogModule } from '@ts-ioc/logs';
import { CoreModule } from './CoreModule';
import { SequenceActivity } from './activities';

/**
 * workflow builder.
 *
 * @export
 * @class Workflow
 * @extends {ApplicationBuilder<IActivity>}
 * @implements {IWorkflow}
 */
export class Workflow extends ApplicationBuilder<IActivity> implements IWorkflow {
    constructor() {
        super();
        this.onInit();
    }

    protected onInit() {
        this.use(AopModule)
            .use(LogModule)
            .use(CoreModule);
    }


    /**
     * create task container.
     *
     * @static
     * @param {(string | AppConfigure)} [config]
     * @returns {IWorkflow}
     * @memberof Workflow
     */
    static create(config?: string | AppConfigure): IWorkflow {
        let workflow = new Workflow();
        if (config) {
            workflow.useConfiguration(config);
        }
        return workflow;
    }

    getWorkflow<T>(workflowId: string): IWorkflowInstance<T> {
        return this.getPools().getRoot().get(workflowId);
    }

    async bootstrap(token: Active, config?: CoreActivityConfigs | BootOptions<IActivity>, options?: BootOptions<IActivity>): Promise<IWorkflowInstance<any>> {
        return await super.bootstrap(token, config, options) as IWorkflowInstance<any>;
    }

    async createActivity(activity: Active, workflowId?: string): Promise<IWorkflowInstance<any>> {
        let boot: Active;
        workflowId = workflowId || this.createUUID();

        if (isToken(activity)) {
            boot = activity;
        } else {
            boot = activity || {};
        }
        let env = this.getPools().getRoot();
        let options = { };
        env.bindProvider(WorkflowId, workflowId);
        let runner = await this.bootstrap(boot, options) as IWorkflowInstance<any>;
        return runner;
    }

    async sequence(...activities: Active[]): Promise<IWorkflowInstance<any>> {
        let workflows = (activities.length > 1) ? <SequenceConfigure>{ sequence: activities, activity: SequenceActivity } : lang.first(activities);
        let runner = await this.createActivity(workflows);
        return runner;
    }

    run(...activities: Active[]): Promise<IWorkflowInstance<any>> {
        return this.sequence(...activities);
    }

    protected createUUID() {
        let container = this.getPools().getRoot();
        if (!container.has(UUIDToken)) {
            container.register(RandomUUIDFactory);
        }
        return container.get(UUIDToken).generate();
    }
}
