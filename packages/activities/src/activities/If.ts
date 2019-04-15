import { Task } from '../decorators/Task';
import { ActivityContext, IfActivityOption } from '../core';
import { ConditionActivity } from './ConditionActivity';

/**
 * if control activity.
 *
 * @export
 * @class IfActivity
 * @extends {ControlActivity}
 */
@Task('if')
export class IfActivity<T extends ActivityContext> extends ConditionActivity<T> {

    /**
     * init activity.
     *
     * @param {IfActivityOption<T>} option
     * @memberof Activity
     */
    async init(option: IfActivityOption<T>) {
        this.initCondition(option.if);
    }

    protected async vaild(ctx: T): Promise<boolean> {
        let condition = await this.resolveExpression(this.condition, ctx);
        ctx.preCondition = condition;
        return condition;
    }
}
