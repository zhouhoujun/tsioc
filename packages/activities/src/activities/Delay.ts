import { PromiseUtil, isArray } from '@tsdi/ioc';
import { Task } from '../decorators/Task';
import { ActivityContext, Expression, DelaylOption } from '../core';
import { ControlActivity } from './ControlActivity';
import { TimerActivity } from './TimerActivity';


/**
 * delay control activity.
 *
 * @export
 * @class DelayActivity
 * @extends {ControlActivity}
 */
@Task('delay')
export class DelayActivity<T extends ActivityContext> extends TimerActivity<T> {

    async init(option: DelaylOption<T>) {
        this.initTimerOption(option.delay);
    }

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let delay = await this.resolveExpression(this.time, ctx);
        let defer = PromiseUtil.defer();
        let timmer = setTimeout(() => {
            defer.resolve();
            clearTimeout(timmer);
        }, delay);
        await defer.promise;
        await super.execute(ctx, next);
    }
}

