import { Task } from '../decorators/Task';
import { Activity, ActivityContext } from '../core';
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
            await this.execIf(ctx, confg);
        } else {
            await this.execElse(ctx, confg);
        }
    }

    protected async execIf(ctx: T, confg: IfConfigure): Promise<void> {
        if (confg.ifBody) {
            await this.execActions(ctx, [confg.ifBody])
        }
    }

    protected async execElse(ctx: T, confg: IfConfigure): Promise<void> {
        if (confg.elseBody) {
            await this.execActions(ctx, [confg.elseBody]);
        }
    }

}
