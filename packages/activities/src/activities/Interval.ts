import { Task } from '../decorators';
import { ActivityContext, Activity } from '../core';
import { TimerActivity } from './TimerActivity';
import { Input } from '@tsdi/boot';
import { BodyActivity } from './BodyActivity';

/**
 * while control activity.
 *
 * @export
 * @class IntervalActivity
 * @extends {ControlActivity}
 */
@Task('interval')
export class IntervalActivity<T extends ActivityContext> extends Activity<T> {

    @Input()
    timer: TimerActivity;

    @Input()
    body: BodyActivity<T>;

    async execute(ctx: T): Promise<void> {
        await this.timer.run(ctx);
        setInterval(() => {
            this.body.run(ctx);
        }, this.timer.result.value);
    }
}
