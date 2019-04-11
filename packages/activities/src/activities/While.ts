import { Task } from '../decorators/Task';
import { ActivityContext } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * while control activity.
 *
 * @export
 * @class WhileActivity
 * @extends {ControlActivity}
 */
@Task('while')
export class WhileActivity<T extends ActivityContext> extends ControlActivity<T> {

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let condition = await this.resolveSelector<boolean>(ctx);
        if (condition) {
            await super.execute(ctx, () => {
                return this.execute(ctx, next);
            });
        } else {
            await next();
        }
    }
}
