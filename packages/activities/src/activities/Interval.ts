import { Task } from '../decorators/Task';
import { ActivityContext } from '../core';
import { ControlActivity } from './ControlActivity';

/**
 * while control activity.
 *
 * @export
 * @class IntervalActivity
 * @extends {ControlActivity}
 */
@Task({
    selector: 'interval'
})
export class IntervalActivity<T extends ActivityContext> extends ControlActivity<T> {

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let config = this.context.config as IntervalConfigure;
        let interval = await this.resolveExpression(config.interval);
        setInterval(() => {
            super.execute(ctx, next);
        }, interval);
    }
}
