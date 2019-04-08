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
        while (condition) {
            await super.execute(ctx);
            condition = await this.resolveSelector<boolean>(ctx);
        }
        await next();
    }
}
