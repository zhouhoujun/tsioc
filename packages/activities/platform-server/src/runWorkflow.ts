import { TaskContainer, IWorkflowInstance, ActivityType, IActivity } from '@taskfr/core';
import { ServerTaskModule } from './ServerTaskModule';
import * as path from 'path';

/**
 * process root.
 */
const processRoot = path.join(path.dirname(process.cwd()), path.basename(process.cwd()));

/**
 * run workflow.
 *
 * @export
 * @template T
 * @param {ActivityType<T>} activity
 * @param {string} [root]
 * @returns {Promise<IWorkflowInstance<T>>}
 */
export function runWorkflow<T extends IActivity>(activity: ActivityType<T>, root?: string): Promise<IWorkflowInstance<T>> {
    let taskContainer = new TaskContainer(root || processRoot);
    taskContainer.use(ServerTaskModule);
    return taskContainer.bootstrap(activity);
}

