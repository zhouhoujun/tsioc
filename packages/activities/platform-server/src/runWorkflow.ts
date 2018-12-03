import { TaskContainer, IActivityRunner, ActivityType, IActivity } from '@taskfr/core';
import { ServerTaskModule } from './ServerTaskModule';
import * as path from 'path';

const processRoot = path.join(path.dirname(process.cwd()), path.basename(process.cwd()));

/**
 * run workflow.
 *
 * @export
 * @template T
 * @param {ActivityType<T>} activity
 * @param {string} [root]
 * @returns {Promise<IActivityRunner<T>>}
 */
export function runWorkflow<T extends IActivity>(activity: ActivityType<T>, root?: string): Promise<IActivityRunner<T>> {
    let taskContainer = new TaskContainer(root || processRoot);
    taskContainer.use(ServerTaskModule);
    return taskContainer.bootstrap(activity);
}

