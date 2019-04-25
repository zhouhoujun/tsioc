import { Task } from '../decorators';
import { ActivityContext, Expression, ConditionTemplate, Activity, ConditionConfigure } from '../core';

/**
 * condition activity.
 *
 * @export
 * @class ConditionActivity
 * @extends {ControlActivity<T>}
 * @template T
 */
@Task('[condition]')
export class ConditionActivity extends Activity<boolean> {

    protected condition: Expression<boolean>;

    onActivityInit(option: ConditionConfigure) {
        super.onActivityInit(option);
        this.condition = option.condition;
    }

    protected async execute(ctx: ActivityContext): Promise<void> {
        this.result.value = await this.resolveExpression(this.condition, ctx);
    }

}
