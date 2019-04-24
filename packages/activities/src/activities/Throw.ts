import { Task } from '../decorators/Task';
import { ActivityContext, ThrowTemplate, Expression, Activity } from '../core';


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
    async init(option: ThrowTemplate<T>) {
        this.throw = option.throw;
        await super.init(option);
    }

    async run(ctx: T, next: () => Promise<void>): Promise<void> {
        let error = await this.resolveExpression(this.throw, ctx);
        throw error;
    }
}
