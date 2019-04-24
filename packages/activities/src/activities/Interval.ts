import { Task } from '../decorators/Task';
import { ActivityContext } from '../core';
import { TimerActivity } from './TimerActivity';

/**
 * while control activity.
 *
 * @export
 * @class IntervalActivity
 * @extends {ControlActivity}
 */
@Task('interval')
export class IntervalActivity<T extends ActivityContext> extends TimerActivity<T> {

    async run(ctx: T, next: () => Promise<void>): Promise<void> {
        let interval = await this.resolveExpression<number>(this.time, ctx);
        setInterval(() => {
            this.execBody(ctx);
        }, interval);
    }
}
