import { ConditionActivity } from './ConditionActivity';
import { Task } from '../decorators';
import { ActivityContext } from '../core';

/**
 * else activity.
 *
 * @export
 * @class ElseActivity
 * @extends {ConditionActivity<T>}
 * @template T
 */
@Task('else')
export class ElseActivity<T extends ActivityContext> extends ConditionActivity<T> {

    protected async vaildate(ctx: T): Promise<boolean> {
        return !ctx.preCondition;
    }
}
