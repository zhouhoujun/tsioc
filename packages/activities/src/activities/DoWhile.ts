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
        let config = ctx.config as DoWhileConfigure;
        await super.execute(ctx);
        let condition = await this.resolveExpression(config.while);
        while (condition) {
            await super.execute(ctx);
            condition = await this.resolveExpression(config.while);
        }
        await next();
    }
}
