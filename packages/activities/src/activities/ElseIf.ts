import { ConditionActivity } from './ConditionActivity';
import { Task } from '../decorators';
import { ActivityContext, ElseIfActivityOption } from '../core';

@Task('elseif')
export class ElseIfActivity<T extends ActivityContext> extends ConditionActivity<T> {

    /**
     * init activity.
     *
     * @param {IfActivityOption<T>} option
     * @memberof Activity
     */
    async init(option: ElseIfActivityOption<T>) {
        this.initCondition(option.elseif);
    }

    protected async vaild(ctx: T): Promise<boolean> {
        if (!ctx.preCondition) {
            ctx.preCondition = await this.resolveExpression(this.condition, ctx);
        }
        return ctx.preCondition;
    }
}
