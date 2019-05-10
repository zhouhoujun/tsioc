import { Task } from '../decorators';
import { ActivityContext } from '../core';
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
export class ElseIfActivity<T> extends IfActivity<T> {

    protected async execute(ctx: ActivityContext): Promise<void> {
        let curr = ctx.runnable.status.parentScope;
        if (curr && curr.subs.length) {
            let activity = curr.subs.find(a => a instanceof ElseIfActivity || a instanceof IfActivity);
            if (activity && !activity.result.value) {
                await super.execute(ctx);
            }
        }
    }
}
