import { Task, Input } from '../decorators';
import { ActivityContext, Activity } from '../core';
import { BodyActivity } from './BodyActivity';
import { ElseIfActivity } from './ElseIf';
import { IfActivity } from './If';

/**
 * else activity.
 *
 * @export
 * @class ElseActivity
 * @extends {ConditionActivity<T>}
 * @template T
 */
@Task('else')
export class ElseActivity<T extends ActivityContext> extends Activity<T> {
    isScope = true;
    @Input()
    body: BodyActivity<T>;

    async execute(ctx: ActivityContext): Promise<void> {
        let curr = ctx.runnable.status.parentScope;
        if (curr && curr.subs.length) {
            let activity = curr.subs.find(a => a instanceof ElseIfActivity || a instanceof IfActivity);
            if (activity && !activity.result.value) {
                await this.execute(ctx);
            }
        }
    }
}
