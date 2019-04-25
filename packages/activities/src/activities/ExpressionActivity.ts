import { Task } from '../decorators';
import { ActivityContext, Activity, Expression, ExpressionTemplate } from '../core';

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

    expression: Expression<T>;

    async init(option: ExpressionTemplate) {
        this.expression = option.expression;
        await super.init(option);
    }

    protected async execute(ctx: ActivityContext): Promise<void> {
        this.result.value = await this.resolveExpression(this.expression, ctx);
    }
}
