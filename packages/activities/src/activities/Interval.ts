import { Task } from '../decorators/Task';
import { ActivityContext, IntervalOption } from '../core';
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

    async init(option: IntervalOption<T>) {
        this.initTimerOption(option.interval);
    }

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let interval = await this.resolveExpression<number>(this.time, ctx);
        setInterval(() => {
            super.execute(ctx);
        }, interval);
    }
}
