import { TaskContainer, IWorkflowInstance, ActivityType, IActivity } from '@taskfr/core';
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
export function runWorkflow<T extends IActivity>(activity: ActivityType<T>, root?: string): Promise<IWorkflowInstance<T>> {
    let taskContainer = new TaskContainer(root);
    taskContainer.use(BrowserTaskModule);
    return taskContainer.bootstrap(activity);
}

