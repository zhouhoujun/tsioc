import { PromiseUtil } from '@tsdi/ioc';
import { Task } from '../decorators/Task';
import { ActivityContext } from '../core';
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

    async execute(ctx: T): Promise<void> {
        let delay = await this.resolveExpression(this.time, ctx);
        let defer = PromiseUtil.defer();
        let timmer = setTimeout(() => {
            defer.resolve();
            clearTimeout(timmer);
        }, delay);
        await defer.promise;
        await this.execBody(ctx);
    }
}

