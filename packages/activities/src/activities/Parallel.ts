import { Task } from '../decorators/Task';
import { ActivityContext, ParallelOption } from '../core';
import { ControlActivity } from './ControlActivity';



/**
 * parallel activity.
 *
 * @export
 * @class ParallelActivity
 * @extends {ControlActivity}
 */
@Task('parallel')
export class ParallelActivity<T extends ActivityContext> extends ControlActivity<T> {

    async init(option: ParallelOption<T>) {
        this.initBody(option.parallel);
    }
    /**
     * execute parallel.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof ParallelActivity
     */
    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        await Promise.all(this.activities.map(act => this.execActivity(ctx, [act])));
        await next();
    }
}
