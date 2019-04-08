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
@Task({
    selector: 'dowhile'
})
export class DoWhileActivity<T extends ActivityContext> extends ControlActivity<T> {

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        await super.execute(ctx);
        let condition = await this.resolveSelector(ctx);
        while (condition) {
            await super.execute(ctx);
            condition = await this.resolveSelector(ctx);
        }
        await next();
    }
}
