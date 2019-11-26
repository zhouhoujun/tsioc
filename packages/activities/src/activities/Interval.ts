import { Input } from '@tsdi/components';
import { Task } from '../decorators';
import { ActivityContext, ControlActivity } from '../core';
import { TimerActivity } from './TimerActivity';
import { BodyActivity } from './BodyActivity';

/**
 * while control activity.
 *
 * @export
 * @class IntervalActivity
 * @extends {ControlActivity}
 */
@Task('interval')
export class IntervalActivity<T> extends ControlActivity<T> {

    @Input() timer: TimerActivity;

    @Input() body: BodyActivity<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        await this.timer.run(ctx);
        setInterval(() => {
            this.body.run(ctx);
        }, this.timer.result.value);
    }
}
