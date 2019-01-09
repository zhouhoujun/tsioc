import { IWorkflowInstance, ActivityType, IActivity, Workflow } from '@ts-ioc/activities';
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
    let Worflow = new Workflow();
    Worflow.use(BrowserTaskModule);
    return Worflow.run(activity);
}

