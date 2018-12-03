import { IContainer, Singleton, InjectModuleValidateToken, lang, Token } from '@ts-ioc/core';
import { ActivityType, IActivity, Activity } from '../core';
import { ModuleBuilder, ModuleEnv, Runnable, InjectModuleBuilderToken } from '@ts-ioc/bootstrap';
import { WorkflowModuleValidateToken } from './WorkflowModuleValidate';


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

    protected getDefaultValidateToken(): Token<any> {
        return WorkflowModuleValidateToken;
    }
}

