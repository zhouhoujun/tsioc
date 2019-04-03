import { PromiseUtil } from '@tsdi/ioc';
import { Task } from '../decorators/Task';
import { DelayConfigure, ActivityContext } from '../core';
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

    constructor(protected delay: number) {
        super();
    }

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let config = ctx.config as DelayConfigure;
        let delay = await this.resolveExpression(config.delay);
        let defer = PromiseUtil.defer();
        let timmer = setTimeout(() => {
            defer.resolve();
            clearTimeout(timmer);
        }, delay);
        await defer.promise;
        await super.execute(ctx, next);
    }
}

