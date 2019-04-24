import { Task } from '../decorators/Task';
import { ActivityContext } from '../core';
import { BodyActivity } from './BodyActivity';



/**
 * parallel activity.
 *
 * @export
 * @class ParallelActivity
 * @extends {ControlActivity}
 */
@Task('parallel')
export class ParallelActivity<T extends ActivityContext> extends BodyActivity<T> {

    /**
     * execute parallel.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof ParallelActivity
     */
    async run(ctx: T, next: () => Promise<void>): Promise<void> {
        await Promise.all(this.body.map(act => this.execActivity(ctx, act)));
        await next();
    }
}
