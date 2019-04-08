import { PromiseUtil } from '@tsdi/ioc';
import { Task } from '../decorators/Task';
import { ActivityContext } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * while control activity.
 *
 * @export
 * @class DelayActivity
 * @extends {ControlActivity}
 */
@Task({
    selector: 'delay'
})
export class DelayActivity<T extends ActivityContext> extends ControlActivity<T> {

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let delay = await this.resolveSelector<number>(ctx);
        let defer = PromiseUtil.defer();
        let timmer = setTimeout(() => {
            defer.resolve();
            clearTimeout(timmer);
        }, delay);
        await defer.promise;
        await super.execute(ctx, next);
    }
}

