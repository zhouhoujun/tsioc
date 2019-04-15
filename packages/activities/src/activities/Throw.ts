import { Task } from '../decorators/Task';
import { ActivityContext, ThrowOption, Expression } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * throw control activity.
 *
 * @export
 * @class ThrowActivity
 * @extends {ControlActivity}
 */
@Task('throw')
export class ThrowActivity<T extends ActivityContext> extends ControlActivity<T> {

    throw: Expression<Error>;
    async init(option: ThrowOption<T>) {
        this.throw = option.throw;
    }

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let error = await this.resolveExpression(this.throw, ctx);
        throw error;
    }
}
