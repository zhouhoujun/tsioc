import { Task } from '../decorators/Task';
import { ActivityContext, CompoiseActivity, ActivityType } from '../core';
import { Input } from '@tsdi/boot';



/**
 * parallel activity.
 *
 * @export
 * @class ParallelActivity
 * @extends {ControlActivity}
 */
@Task('parallel')
export class ParallelActivity<T> extends CompoiseActivity<T> {

    constructor(@Input() activities: ActivityType[]) {
        super()
        this.activities = activities || [];
    }
    /**
     * execute parallel.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof ParallelActivity
     */
    protected async execute(ctx: ActivityContext): Promise<void> {
        await Promise.all(this.activities.map(act => this.execActivity(ctx, act)));
    }
}
