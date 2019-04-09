import { Task } from '../decorators/Task';
import { CompoiseActivity, ActivityContext, ActivityType } from '../core';
import { isArray } from '@tsdi/ioc';

/**
 * sequence activity.
 *
 * @export
 * @class SequenceActivity
 * @extends {ControlActivity}
 */
@Task('sequence')
export class SequenceActivity<T extends ActivityContext> extends CompoiseActivity<T> {
    /**
     * execute sequence.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof ParallelActivity
     */
    async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        this.resetFuncs();
        let acts = await this.resolveSelector<ActivityType<T>[]>(ctx);
        this.activities = isArray(acts) ? acts : [acts];
        await super.execute(ctx, next);
    }
}
