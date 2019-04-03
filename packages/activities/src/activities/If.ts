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
@Task({
    selector: 'if'
})
export class IfActivity<T extends ActivityContext> extends ControlActivity<T> {

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let confg = ctx.config as IfConfigure;
        let condition = await this.resolveExpression(confg.if);
        if (condition) {
            await this.execActions(ctx, this.handles.slice(0, 1), next);
        } else {
            await this.execActions(ctx, this.handles.slice(1, 2), next);
        }
    }
}
