import { IApplicationBuilder, BootOptions } from '@ts-ioc/bootstrap';
import { IActivity, IWorkflowInstance, Active, CoreActivityConfigs } from './core';
import { Token } from '@ts-ioc/core';

export interface IWorkflow extends IApplicationBuilder<IActivity> {

    /**
     * bootstrap by activity config.
     *
     * @param {CoreActivityConfigs} config
     * @param {BootOptions<IActivity>} [options]
     * @returns {Promise<IWorkflowInstance<any>>}
     * @memberof IWorkflow
     */
    bootstrap(config: Active, options?: BootOptions<IActivity>): Promise<IWorkflowInstance<any>>;
    /**
     * bootstrap with module and config.
     *
     * @param {Token<IActivity>} token
     * @param {CoreActivityConfigs} config
     * @param {BootOptions<IActivity>} options
     * @returns {Promise<IWorkflowInstance<any>>}
     * @memberof IWorkflow
     */
    bootstrap(token: Token<IActivity>, config: CoreActivityConfigs, options: BootOptions<IActivity>): Promise<IWorkflowInstance<any>>;

    /**
     * get workflow.
     *
     * @template T
     * @param {string} workflowId
     * @returns {IWorkflowInstance<T>}
     * @memberof ITaskContainer
     */
    getWorkflow<T>(workflowId: string): IWorkflowInstance<T>;

    /**
     * create workflow by activity.
     *
     * @param {Active} activity
     * @param {string} [workflowId]
     * @memberof ITaskContainer
     */
    createActivity(activity: Active, workflowId?: string): Promise<IWorkflowInstance<any>>;

    /**
     * start sequece workflow.
     *
     * @param {...Active[]} activities
     * @returns {Promise<IWorkflowInstance<any>>}
     * @memberof IWorflow
     */
    sequence(...activities: Active[]): Promise<IWorkflowInstance<any>>;

    /**
     * run activities.
     *
     * @param {...Active[]} activities
     * @returns {Promise<IWorkflowInstance<any>>}
     * @memberof IWorflow
     */
    run(...activities: Active[]): Promise<IWorkflowInstance<any>>;

}
