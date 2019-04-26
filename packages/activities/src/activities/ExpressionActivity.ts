import { Task } from '../decorators';
import { ActivityContext, Activity, Expression } from '../core';
import { Inject } from '@tsdi/ioc';
import { ContainerToken, IContainer } from '@tsdi/core';

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

    constructor(
        @Inject('[expression]') protected expression: Expression<T>,
        @Inject(ContainerToken) container: IContainer) {
        super(container)
    }

    protected async execute(ctx: ActivityContext): Promise<void> {
        this.result.value = await this.resolveExpression(this.expression, ctx);
    }
}
