import { Input, BindingTypes } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ActivityContext } from '../core/ActivityContext';
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

    @Input({ bindingType: BindingTypes.dynamic }) body: ActivityType<any>;

    async execute(ctx: ActivityContext): Promise<void> {
        let interval = await this.timer.execute(ctx);
        let action = ctx.getExector().parseAction(this.body);
        if (!action) {
            return;
        }
        setInterval(() => {
            action(ctx.workflow);
        }, interval);
    }
}
