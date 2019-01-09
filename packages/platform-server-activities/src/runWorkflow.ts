import { IWorkflowInstance, ActivityType, IActivity, Workflow } from '@ts-ioc/activities';
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
    let Worflow = new Workflow();
    Worflow.use(ServerTaskModule);
    return Worflow.run(activity);
}

