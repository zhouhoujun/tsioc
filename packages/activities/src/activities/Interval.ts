import { Task } from '../decorators';
import { ActivityContext } from '../core';
import { TimerActivity } from './TimerActivity';
import { Input } from '@tsdi/components';
import { BodyActivity } from './BodyActivity';
import { ControlActivity } from './ControlActivity';

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
