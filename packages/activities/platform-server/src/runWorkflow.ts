import { IWorkflowInstance, ActivityType, IActivity, Workflow } from '@taskfr/core';
import { ServerTaskModule } from './ServerTaskModule';

/**
 * run workflow.
 *
 * @export
 * @template T
 * @param {ActivityType<T>} activity
 * @param {string} [root]
 * @returns {Promise<IWorkflowInstance<T>>}
 */
export function runWorkflow<T extends IActivity>(activity: ActivityType<T>): Promise<IWorkflowInstance<T>> {
    let taskContainer = new Workflow();
    taskContainer.use(ServerTaskModule);
    return taskContainer.run(activity);
}

