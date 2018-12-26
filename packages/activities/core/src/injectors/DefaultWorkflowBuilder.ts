import { Singleton, Providers, MetaAccessorToken } from '@ts-ioc/core';
import { ActivityType, IActivity, ActivityToken, ActivityBuilderToken, CoreActivityConfigs } from '../core';
import { ModuleBuilder, Runnable, InjectModuleBuilderToken, AnnotationBuilderToken, BootOptions } from '@ts-ioc/bootstrap';
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
    { provide: MetaAccessorToken, useExisting: ActivityMetaAccessorToken },
    { provide: AnnotationBuilderToken, useExisting: ActivityBuilderToken }
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
    async bootstrap(activity: ActivityType<IActivity>, config?: CoreActivityConfigs|BootOptions<IActivity>, options?: BootOptions<IActivity>): Promise<Runnable<IActivity>> {
        return await super.bootstrap(activity, config, options);
    }
}

