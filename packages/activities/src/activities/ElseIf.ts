import { ConditionActivity } from './ConditionActivity';
import { Task } from '../decorators';
import { ActivityContext } from '../core';

/**
 * else if activity.
 *
 * @export
 * @class ElseIfActivity
 * @extends {ConditionActivity<T>}
 * @template T
 */
@Task('elseif')
export class ElseIfActivity<T extends ActivityContext> extends ConditionActivity<T> {

    protected async vaildate(ctx: T): Promise<boolean> {
        if (!ctx.preCondition) {
            ctx.preCondition = await this.resolveExpression(this.condition, ctx);
        }
        return ctx.preCondition;
    }
}
