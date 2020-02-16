import { isString } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ControlActivity } from '../core/ControlActivity';
import { Expression } from '../core/ActivityMetadata';
import { ActivityContext } from '../core/ActivityContext';
import { expExp } from '../utils/exps';


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

    async execute(ctx: ActivityContext): Promise<T> {
        let expression;
        if (isString(this.expression)  && expExp.test(this.expression)) {
            expression = ctx.getExector().eval(this.expression);
        } else {
            expression = ctx.resolveExpression(this.expression);
        }
        return expression;
    }

}
