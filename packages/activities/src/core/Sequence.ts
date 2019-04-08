import { Task } from '../decorators/Task';
import { ActivityContext, ActivityOption } from './ActivityContext';
import { CompoiseActivity } from './CompoiseActivity';
import { ActivityType } from './Activity';


export interface SequenceOption<T extends ActivityContext> extends ActivityOption {
    sequence: ActivityType<T>[];
}


/**
 * sequence activity.
 *
 * @export
 * @class SequenceActivity
 * @extends {ControlActivity}
 */
@Task({
    selector: 'sequence'
})
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
        this.activities = await this.resolveSelector(ctx);
        await super.execute(ctx, next);
    }
}
