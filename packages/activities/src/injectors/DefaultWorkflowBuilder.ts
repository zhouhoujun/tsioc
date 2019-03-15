import { Singleton, Providers } from '@ts-ioc/ioc';
import { IActivity, CoreActivityConfigs, Active, ActivityMetaAccessor, ActivityBuilder } from '../core';
import { ModuleBuilder, AnnotationBuilder, BootOptions, IRunnable } from '@ts-ioc/bootstrap';
import { MetaAccessor } from '@ts-ioc/bootstrap';


/**
 * default Workflow Builder.
 *
 * @export
 * @class DefaultTaskContainer
 */
@Singleton()
@Providers([
    { provide: MetaAccessor, useClass: ActivityMetaAccessor },
    { provide: AnnotationBuilder, useClass: ActivityBuilder }
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
    async bootstrap(activity: Active, config?: CoreActivityConfigs|BootOptions<IActivity>, options?: BootOptions<IActivity>): Promise<IRunnable<IActivity>> {
        return await super.bootstrap(activity, config, options);
    }
}

