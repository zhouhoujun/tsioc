import { Task } from '../decorators/Task';
import { WhileConfigure, ActivityContext } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * while control activity.
 *
 * @export
 * @class WhileActivity
 * @extends {ControlActivity}
 */
@Task({
    selector: 'while'
})
export class WhileActivity<T extends ActivityContext> extends ControlActivity<T> {

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let config = ctx.config as WhileConfigure;
        let condition = await this.resolveExpression(config.while);
        while (condition) {
            await super.execute(ctx);
            condition = await this.resolveExpression(config.while);
        }
        await next();
    }
}
