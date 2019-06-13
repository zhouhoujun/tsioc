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
        let { subs } = ctx.runnable.status.currentScope;
        if (subs && subs.length) {
            let activity = subs.find(a => a !== this && a instanceof IfActivity) as IfActivity<any>;
            if (activity && !activity.condition.result.value) {
                await this.tryExec(ctx);
            }
        }
    }
}
