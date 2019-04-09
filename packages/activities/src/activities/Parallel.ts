import { Task } from '../decorators/Task';
import { CompoiseActivity, ActivityContext, ActivityType } from '../core';



/**
 * parallel activity.
 *
 * @export
 * @class ParallelActivity
 * @extends {ControlActivity}
 */
@Task('parallel')
export class ParallelActivity<T extends ActivityContext> extends CompoiseActivity<T> {

    /**
     * execute parallel.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof ParallelActivity
     */
    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let parallel = await this.resolveSelector<ActivityType<T>[]>(ctx);
        if (parallel && parallel.length) {
            await Promise.all(parallel.map(act => this.execActivity(ctx, act)));
        }
        await next();
    }
}
