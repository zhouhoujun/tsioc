import { IContainer, Singleton, Token, ProviderTypes } from '@ts-ioc/core';
import {
    ActivityType, IActivity, UUIDToken, RandomUUIDFactory,
    ActivityConfigure, ActivityRunnerToken, Activity
} from '../core';
import { ModuleBuilder, ModuleEnv, Runnable, IService, InjectModuleBuilderToken } from '@ts-ioc/bootstrap';


/**
 * workflow builder token.
 */
export const WorkflowBuilderToken = new InjectModuleBuilderToken<IActivity>(Activity);
/**
 * default Workflow Builder.
 *
 * @export
 * @class DefaultTaskContainer
 */
@Singleton(WorkflowBuilderToken)
export class DefaultWorkflowBuilder extends ModuleBuilder<IActivity> {
    /**
     * bootstrap workflow via activity.
     *
     * @param {ActivityType<IActivity>} activity
     * @param {ModuleEnv} [env]
     * @param {string} [workflowId]
     * @returns {Promise<IActivityRunner<any>>}
     * @memberof DefaultWorkflowBuilder
     */
    async bootstrap(activity: ActivityType<IActivity>, env?: ModuleEnv, workflowId?: string): Promise<Runnable<IActivity>> {
        let injmdl = await this.load(activity, env);
        workflowId = workflowId || this.createUUID(injmdl.container);
        let runner = await super.bootstrap(activity, injmdl, workflowId);
        return runner;
    }

    protected createUUID(container: IContainer) {
        if (!container.has(UUIDToken)) {
            container.register(RandomUUIDFactory);
        }
        return container.get(UUIDToken).generate();
    }

    protected getBootType(config: ActivityConfigure): Token<any> {
        return config.activity || config.task || super.getBootType(config);
    }

    protected getDefaultService(container: IContainer, ...providers: ProviderTypes[]): IService<IActivity> {
        return container.resolve(ActivityRunnerToken, ...providers);
    }
}

