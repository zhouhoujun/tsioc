import { lang } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../metadata/decor';
import { ControlActivity } from '../core/ControlActivity';
import { ActivityContext } from '../core/ActivityContext';
import { ActivityType } from '../core/ActivityMetadata';
import { TimerActivity } from './TimerActivity';



/**
 * delay control activity.
 *
 * @export
 * @class DelayActivity
 * @extends {ControlActivity}
 */
@Task('delay')
export class DelayActivity extends ControlActivity {

    @Input() timer: TimerActivity;

    @Input({ bindingType: 'dynamic' }) body: ActivityType<any>;

    async execute(ctx: ActivityContext): Promise<void> {
        let timeout = await this.timer.execute(ctx);
        await lang.delay(timeout);
        await ctx.getExector().runActivity(this.body);
    }
}

