import { Task } from '../decorators';
import { ActivityContext, Expression } from '../core';
import { Input } from '@tsdi/components';
import { ControlActivity } from './ControlActivity';
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
export class ExpressionActivity<T> extends ControlActivity<T> {

    @Input() expression: Expression<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let expression;
        if (isString(this.expression)) {
            try {
                // tslint:disable-next-line:no-eval
                expression = eval(this.expression);
            } catch { }
        } else {
            expression = this.expression;
        }

        this.result.value = await this.resolveExpression(expression, ctx);
    }

}
