import { Input } from '@tsdi/components';
import { Task } from '../metadata/decor';
import { ActivityType } from '../core/ActivityMetadata';
import { ControlActivity } from '../core/ControlActivity';
import { IActivityContext } from '../core/IActivityContext';

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

    async execute(ctx: IActivityContext): Promise<T> {
        await ctx.getExector().runActivity(this.activities);
        return ctx.getData();
    }
}
