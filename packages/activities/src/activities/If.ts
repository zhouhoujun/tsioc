import { Task } from '../decorators/Task';
import { ActivityContext, Activity } from '../core';
import { ConditionActivity } from './ConditionActivity';

/**
 * if control activity.
 *
 * @export
 * @class IfActivity
 * @extends {ControlActivity}
 */
@Task('if')
export class IfActivity<T extends ActivityContext> extends Activity<T> {

    protected async vaildate(ctx: T): Promise<boolean> {
        let condition = await this.resolveExpression(this.condition, ctx);
        ctx.preCondition = condition;
        return condition;
    }
}
