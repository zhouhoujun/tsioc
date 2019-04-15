import { Task } from '../decorators/Task';
import { ActivityContext, WhileActivityOption } from '../core';
import { ConditionActivity } from './ConditionActivity';


/**
 * while control activity.
 *
 * @export
 * @class WhileActivity
 * @extends {ControlActivity}
 */
@Task('while')
export class WhileActivity<T extends ActivityContext> extends ConditionActivity<T> {

    async init(option: WhileActivityOption<T>) {
        this.initCondition(option.while);
    }

    protected async whenTrue(ctx: T, next?: () => Promise<void>): Promise<void> {
        await super.execute(ctx, () => {
            return this.execute(ctx, next);
        });
    }
}
