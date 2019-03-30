import { IWorkflowInstance, ActivityType, IActivity, Workflow } from '@tsdi/activities';
import { BrowserActivitiesModule } from './BrowserActivitiesModule';

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
    let Worflow = new Workflow();
    Worflow.use(BrowserActivitiesModule);
    return Worflow.run(activity);
}

