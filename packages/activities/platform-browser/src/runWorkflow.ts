import { IWorkflowInstance, ActivityType, IActivity, Workflow } from '@taskfr/core';
import { BrowserTaskModule } from './BrowserTaskModule';

/**
 * run workflow.
 *
 * @export
 * @template T
 * @param {ActivityType<T>} activity
 * @param {string} [root]
 * @returns {Promise<IActivityRunner<T>>}
 */
export function runWorkflow<T extends IActivity>(activity: ActivityType<T>): Promise<IWorkflowInstance<T>> {
    let taskContainer = new Workflow();
    taskContainer.use(BrowserTaskModule);
    return taskContainer.run(activity);
}

