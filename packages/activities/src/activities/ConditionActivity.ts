import { Task } from '../decorators';
import { ActivityContext, Expression, Activity } from '../core';
import { Inject } from '@tsdi/ioc';

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

    constructor(@Inject('[condition]') protected condition: Expression<boolean>) {
        super()
    }

    protected async execute(ctx: ActivityContext): Promise<void> {
        this.result.value = await this.resolveExpression(this.condition, ctx);
    }

}
