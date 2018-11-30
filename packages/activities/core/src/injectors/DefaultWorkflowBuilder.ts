import { IContainer, Singleton, ProviderTypes, Token } from '@ts-ioc/core';
import {
    ActivityType, IActivity, UUIDToken, RandomUUIDFactory, ActivityRunnerToken, Activity, ActivityConfigure
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
    async bootstrap(activity: ActivityType<IActivity>, env?: ModuleEnv, data?: string): Promise<Runnable<IActivity>> {
        let injmdl = await this.load(activity, env);
        let runner = await super.bootstrap(activity, injmdl, data);
        return runner;
    }

    protected createUUID(container: IContainer) {
        if (!container.has(UUIDToken)) {
            container.register(RandomUUIDFactory);
        }
        return container.get(UUIDToken).generate();
    }

    protected getDefaultService(container: IContainer, ...providers: ProviderTypes[]): IService<IActivity> {
        return container.resolve(ActivityRunnerToken, ...providers);
    }

    protected getBootType(cfg: ActivityConfigure): Token<any> {
        return cfg.bootstrap || cfg.activity || cfg.task;
    }
}

