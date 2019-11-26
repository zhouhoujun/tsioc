import { Task } from '../decorators';
import { ActivityContext, CTX_CONDITION_RESULT } from '../core';
import { IfActivity } from './If';

/**
 * else if activity.
 *
 * @export
 * @class ElseIfActivity
 * @extends {IfActivity<T>}
 * @template T
 */
@Task('elseif')
export class ElseIfActivity<T = any> extends IfActivity<T> {

    protected async execute(ctx: ActivityContext): Promise<void> {
        if (ctx.has(CTX_CONDITION_RESULT) && !ctx.get(CTX_CONDITION_RESULT)) {
            await this.tryExec(ctx);
        }
    }
}
