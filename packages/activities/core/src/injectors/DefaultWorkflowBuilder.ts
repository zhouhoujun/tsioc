import { Singleton, Providers, MetaAccessorToken } from '@ts-ioc/core';
import { ActivityType, IActivity, ActivityToken, ActivityBuilderToken } from '../core';
import { ModuleBuilder, ModuleEnv, Runnable, InjectModuleBuilderToken, AnnotationBuilderToken } from '@ts-ioc/bootstrap';
import { ActivityMetaAccessorToken } from './ActivityMetaAccessor';


/**
 * workflow builder token.
 */
export const WorkflowBuilderToken = new InjectModuleBuilderToken<IActivity>(ActivityToken);
/**
 * default Workflow Builder.
 *
 * @export
 * @class DefaultTaskContainer
 */
@Singleton(WorkflowBuilderToken)
@Providers([
    {provide: MetaAccessorToken, useExisting: ActivityMetaAccessorToken},
    {provide: AnnotationBuilderToken, useExisting: ActivityBuilderToken}
])
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
}

