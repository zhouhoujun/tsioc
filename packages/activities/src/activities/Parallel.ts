import { Input } from '@tsdi/components';
import { Task } from '../decor';
import { ActivityType } from '../core/ActivityMetadata';
import { IActivityContext } from '../core/IActivityContext';
import { ParallelExecutor } from '../core/ParallelExecutor';
import { ControlActivity } from '../core/ControlActivity';


/**
 * parallel activity.
 *
 * @export
 * @class ParallelActivity
 * @extends {ControlActivity}
 */
@Task('parallel')
export class ParallelActivity<T> extends ControlActivity<T[]> {

    @Input() activities: ActivityType[];

    /**
     * execute parallel.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof ParallelActivity
     */
    async execute(ctx: IActivityContext): Promise<T[]> {
        if (ctx.injector.hasRegister(ParallelExecutor)) {
            return await ctx.injector.getInstance(ParallelExecutor).run<ActivityType>(act => ctx.getExector().runWorkflow(act).then(c => c.result), this.activities)
        } else {
            return await Promise.all(this.activities.map(act => ctx.getExector().runWorkflow(act).then(c => c.result)));
        }
    }
}
