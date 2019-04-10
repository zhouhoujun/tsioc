import { Task } from '../decorators/Task';
import { ActivityContext } from '../core';
import { ControlActivity } from './ControlActivity';

/**
 * if control activity.
 *
 * @export
 * @class IfActivity
 * @extends {ControlActivity}
 */
@Task('if')
export class IfActivity<T extends ActivityContext> extends ControlActivity<T> {

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let condition = await this.resolveSelector<boolean>(ctx);
        if (condition) {
            await this.execActivity(ctx, this.activities.slice(0, 1), next);
        } else {
            await this.execActivity(ctx, this.activities.slice(1, 2), next);
        }
    }
}
