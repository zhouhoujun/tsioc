import { Task } from '../decorators/Task';
import { ActivityContext } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * do while control activity.
 *
 * @export
 * @class DoWhileActivity
 * @extends {ControlActivity}
 */
@Task('dowhile')
export class DoWhileActivity<T extends ActivityContext> extends ControlActivity<T> {

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        await super.execute(ctx, async () => {
            let condition = await this.resolveSelector(ctx);
            if (condition) {
                this.execute(ctx, next);
            } else {
                await next();
            }
        });
    }
}
