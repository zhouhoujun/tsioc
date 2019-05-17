import { Task } from '../decorators';
import { ActivityContext, Expression } from '../core';
import { Input } from '@tsdi/boot';
import { ControlerActivity } from './ControlerActivity';

/**
 * execute activity.
 *
 * @export
 * @abstract
 * @class ExecuteActivity
 * @extends {ExecuteActivity<T>}
 * @template T
 */
@Task('execute')
export class ExecuteActivity<T> extends ControlerActivity<T> {


    constructor(@Input() action: Expression<T>) {
        super()
        this.action = action;
    }

    @Input('action')
    action: Expression<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        await this.resolveExpression(this.action, ctx);
    }

}
