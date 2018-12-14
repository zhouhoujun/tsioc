import { IWorkflowInstance, Active } from './core';
import { InjectToken, Type } from '@ts-ioc/core';
import { IApplicationBuilder, IApplicationExtends } from '@ts-ioc/bootstrap';



/**
 * TaskContainer token.
 */
export const TaskContainerToken = new InjectToken<ITaskContainer>('__TASK_TaskContainer');

/**
 * task container.
 *
 * @export
 * @interface ITaskContainer
 * @extends {TaskComponent}
 */
export interface ITaskContainer extends IApplicationExtends {

    /**
     * use log.
     *
     * @param {Type<any>} logAspect
     * @returns {this}
     * @memberof ITaskContainer
     */
    useLog(logAspect: Type<any>): this;

    /**
     * get builder.
     *
     * @returns {IApplicationBuilder<any>}
     * @memberof ITaskContainer
     */
    getBuilder(): IApplicationBuilder<any>;

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
     * create workflow, run it.
     *
     * @param {...Active[]} activities run activities.
     * @returns {Promise<IWorkflowInstance>}
     * @memberof IApplicationBuilder
     */
    run(...activities: Active[]): Promise<IWorkflowInstance<any>>;

    /**
     * create workflow and bootstrap.
     *
     * @param {...Active[]} activities bootstrap activities.
     * @returns {Promise<IWorkflowInstance>}
     * @memberof IApplicationBuilder
     */
    bootstrap(...activities: Active[]): Promise<IWorkflowInstance<any>>;
}
