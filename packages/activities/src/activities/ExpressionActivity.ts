import { Task } from '../decorators';
import { ActivityContext, Activity, Expression } from '../core';
import { Input } from '@tsdi/boot';

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

    constructor(@Input() protected expression: Expression<T>) {
        super()
    }

    protected async execute(ctx: ActivityContext): Promise<void> {
        this.result.value = await this.resolveExpression(this.expression, ctx);
    }
}
