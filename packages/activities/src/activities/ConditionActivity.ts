import { Task, Input } from '../decorators';
import { ActivityContext, Expression, Activity } from '../core';

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

    @Input()
    protected condition: Expression<boolean>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        this.result.value = await this.resolveExpression(this.condition, ctx);
    }

}
