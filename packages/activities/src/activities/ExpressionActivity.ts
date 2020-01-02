import { isString } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ControlActivity } from '../core/ControlActivity';
import { Expression } from '../core/ActivityMetadata';
import { ActivityContext } from '../core/ActivityContext';


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
            expression = this.getExector().eval(ctx, this.expression);
        } else {
            expression = this.expression;
        }

        this.result = await this.resolveExpression(expression, ctx);
    }

}
