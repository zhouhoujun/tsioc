import { Task } from '../decorators/Task';
import { ActivityContext, IntervalOption, Expression } from '../core';
import { ControlActivity } from './ControlActivity';
import { isArray } from '@tsdi/ioc';
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
