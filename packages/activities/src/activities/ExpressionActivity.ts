import { Task, Input } from '../decorators';
import { ActivityContext, Activity, Expression } from '../core';

/**
 * expression activity.
 *
 * @export
 * @abstract
 * @class ExpressionActivity
 * @extends {ExecuteActivity<T>}
 * @template T
 */
@Task('[expression]')
export class ExpressionActivity<T> extends Activity<T> {

    @Input()
    expression: Expression<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        this.result.value = await this.resolveExpression(this.expression, ctx);
    }
}
