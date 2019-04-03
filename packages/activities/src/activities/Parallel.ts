import { Task } from '../decorators/Task';
import { ParallelConfigure, ActivityContext } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * parallel activity.
 *
 * @export
 * @class ParallelActivity
 * @extends {ControlActivity}
 */
@Task({
    selector: 'parallel'
})
export class ParallelActivity<T extends ActivityContext> extends ControlActivity<T> {

    /**
     * execute parallel.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof ParallelActivity
     */
    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let config = ctx.config as ParallelConfigure;
        if (config.parallel && config.parallel.length) {
            await Promise.all(config.parallel.map(act => this.execActivity(ctx, act)));
        }
        await next();
    }
}
