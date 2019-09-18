import { Task } from '../decorators';
import { ActivityContext, Expression } from '../core';
import { Input } from '@tsdi/components';
import { ControlerActivity } from './ControlerActivity';
import { isString } from '@tsdi/ioc';


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
export class ExpressionActivity<T> extends ControlerActivity<T> {

    @Input() expression: Expression<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        if (isString(this.expression)) {
            try {
                // tslint:disable-next-line:no-eval
                this.result.value = eval(this.expression);
            } catch { }
        } else {
            this.result.value = await this.resolveExpression(this.expression, ctx);
        }
    }

}
