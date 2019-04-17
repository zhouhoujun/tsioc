import { Task } from '../decorators';
import { ActivityContext, Activity } from '../core';

/**
 * expression activity.
 *
 * @export
 * @abstract
 * @class ExpressionActivity
 * @extends {ExecuteActivity<T>}
 * @template T
 */
@Task('expression')
export class ExpressionActivity<T extends ActivityContext> extends Activity<T> {

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        // ctx.preCondition = await this.resolveSelector<boolean>(ctx);
        next();
    }
}
