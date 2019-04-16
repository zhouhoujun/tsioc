import { Task } from '../decorators/Task';
import { ActivityContext, ThrowOption, Expression, Activity } from '../core';


/**
 * throw control activity.
 *
 * @export
 * @class ThrowActivity
 * @extends {ControlActivity}
 */
@Task('throw')
export class ThrowActivity<T extends ActivityContext> extends Activity<T> {

    throw: Expression<Error>;
    async init(option: ThrowOption<T>) {
        this.throw = option.throw;
    }

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let error = await this.resolveExpression(this.throw, ctx);
        throw error;
    }
}
