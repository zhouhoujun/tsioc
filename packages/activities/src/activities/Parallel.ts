import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ActivityContext, CompoiseActivity, ActivityType, ParallelExecutor } from '../core';


/**
 * parallel activity.
 *
 * @export
 * @class ParallelActivity
 * @extends {ControlActivity}
 */
@Task('parallel')
export class ParallelActivity<T> extends CompoiseActivity<T> {

    @Input() activities: ActivityType[];

    /**
     * execute parallel.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof ParallelActivity
     */
    protected async execute(ctx: ActivityContext): Promise<void> {
        if (this.getContainer().has(ParallelExecutor)) {
            await this.getContainer().getInstance(ParallelExecutor).run<ActivityType>(act => this.runWorkflow(ctx, act), this.activities)
        } else {
            await Promise.all(this.activities.map(act => this.runWorkflow(ctx, act)));
        }
    }
}
