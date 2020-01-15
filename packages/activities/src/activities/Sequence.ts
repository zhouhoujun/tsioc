import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ActivityType } from '../core/ActivityMetadata';
import { ControlActivity } from '../core/ControlActivity';
import { ActivityContext } from '../core/ActivityContext';

/**
 * sequence activity.
 *
 * @export
 * @class SequenceActivity
 * @extends {ControlActivity}
 */
@Task('sequence')
export class SequenceActivity<T> extends ControlActivity<T> {

    @Input() activities: ActivityType[];

    async execute(ctx: ActivityContext): Promise<T> {
        await ctx.getExector().runActivity(this.activities);
        return ctx.output;
    }
}
