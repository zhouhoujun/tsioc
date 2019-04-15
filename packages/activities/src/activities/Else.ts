import { ConditionActivity } from './ConditionActivity';
import { Task } from '../decorators';
import { ActivityContext, ElseActivityOption } from '../core';

@Task('else')
export class ElseActivity<T extends ActivityContext> extends ConditionActivity<T> {

    /**
     * init activity.
     *
     * @param {ElseActivityOption<T>} option
     * @memberof Activity
     */
    async init(option: ElseActivityOption<T>) {
        this.initCondition({ condition: true, body: option.else });
    }

    protected async vaild(ctx: T): Promise<boolean> {
        if (!ctx.preCondition) {
            return true;
        }
        return false;
    }
}
