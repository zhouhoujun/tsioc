import { IWorkflowInstance, ActivityType, IActivity, Workflow } from '@ts-ioc/activities';
import { ServerActivitiesModule } from './ServerActivitiesModule';

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
    Worflow.use(ServerActivitiesModule);
    return Worflow.run(activity);
}

