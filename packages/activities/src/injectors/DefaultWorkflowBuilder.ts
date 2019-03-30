import { Singleton, Providers } from '@tsdi/ioc';
import { IActivity, CoreActivityConfigs, Active, ActivityMetaAccessor, ActivityBuilder } from '../core';
import { ModuleBuilder, AnnotationBuilder, BootOption, IRunnable } from '@tsdi/boot';
import { MetaAccessor } from '@tsdi/boot';


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
    async bootstrap(activity: Active, config?: CoreActivityConfigs|BootOption<IActivity>, options?: BootOption<IActivity>): Promise<IRunnable<IActivity>> {
        return await super.bootstrap(activity, config, options);
    }
}

