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
        let interval = await this.resolveSelector<number>(ctx);
        setInterval(() => {
            super.execute(ctx, next);
        }, interval);
    }
}
