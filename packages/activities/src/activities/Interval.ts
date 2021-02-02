import { Input } from '@tsdi/components';
import { Task } from '../decor';
import { IActivityContext } from '../core/IActivityContext';
import { ControlActivity } from '../core/ControlActivity';
import { TimerActivity } from './TimerActivity';
import { ActivityType } from '../core/ActivityMetadata';

/**
 * while control activity.
 *
 * @export
 * @class IntervalActivity
 * @extends {ControlActivity}
 */
@Task('interval')
export class IntervalActivity extends ControlActivity {

    @Input() timer: TimerActivity;

    @Input({ bindingType: 'dynamic' }) body: ActivityType<any>;

    async execute(ctx: IActivityContext): Promise<void> {
        if (!this.body) {
            return;
        }
        let interval = await this.timer.execute(ctx);
        setInterval(() => {
            ctx.getExector().runActivity(this.body);
        }, interval);
    }
}
