import { ApplicationBuilder, BootOptions } from '@ts-ioc/bootstrap';
import { IActivity, IWorkflowInstance, Active, SequenceConfigure, WorkflowId, UUIDToken, RandomUUIDFactory, CoreActivityConfigs } from './core';
import { IWorkflow } from './IWorkflow';
import { LoadType, lang, isToken } from '@ts-ioc/core';
// import { WorkflowModuleValidate, WorkflowModuleInjector, WorkflowModuleInjectorToken } from './injectors';
import { AopModule } from '@ts-ioc/aop';
import { LogModule } from '@ts-ioc/logs';
import { CoreModule } from './CoreModule';
import { SequenceActivity } from './activities';


export class Workflow extends ApplicationBuilder<IActivity> implements IWorkflow {
    constructor() {
        super();
        this.onInit();
    }

    protected onInit() {
        // this.on(ApplicationEvents.onRootContainerCreated, (container: IContainer) => {
        //     container.register(WorkflowModuleValidate)
        //         .register(WorkflowModuleInjector);
        //     let chain = container.getBuilder().getInjectorChain(container);
        //     chain.first(container.resolve(WorkflowModuleInjectorToken));
        // })
        this.use(AopModule)
            .use(LogModule)
            .use(CoreModule);
    }


    /**
     * create task container.
     *
     * @static
     * @param {string} [root]
     * @param {...ModuleType[]} modules
     * @returns {ITaskContainer}
     * @memberof TaskContainer
     */
    static create(...modules: LoadType[]): IWorkflow {
        let workflow = new Workflow();
        if (modules) {
            workflow.use(...modules);
        }
        return workflow;
    }

    getWorkflow<T>(workflowId: string): IWorkflowInstance<T> {
        return this.getPools().getDefault().resolve(workflowId);
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
        let env = this.getPools().create();
        let options = { env: env, data: workflowId };
        env.bindProvider(WorkflowId, workflowId);
        let runner = await this.bootstrap(boot, options) as IWorkflowInstance<any>;
        env.bindProvider(workflowId, runner);
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
        let container = this.getPools().getDefault();
        if (!container.has(UUIDToken)) {
            container.register(RandomUUIDFactory);
        }
        return container.get(UUIDToken).generate();
    }
}
