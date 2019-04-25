import { ConditionActivity } from './ConditionActivity';
import { Task, Input } from '../decorators';
import { ActivityContext, Activity } from '../core';
import { BodyActivity } from './BodyActivity';
import { IfActivity } from './If';

/**
 * else if activity.
 *
 * @export
 * @class ElseIfActivity
 * @extends {ConditionActivity<T>}
 * @template T
 */
@Task('elseif')
export class ElseIfActivity<T> extends Activity<T> {
    isScope = true;

    @Input()
    condition: ConditionActivity;

    @Input()
    body: BodyActivity<T>;

    async execute(ctx: ActivityContext): Promise<void> {
        let curr = ctx.runnable.status.parentScope;
        if (curr && curr.subs.length) {
            let activity = curr.subs.find(a => a instanceof ElseIfActivity || a instanceof IfActivity);
            if (activity && !activity.result.value) {
                await this.condition.run(ctx);
                if (this.condition.result.value) {
                    await this.execute(ctx);
                }
            }
        }
    }
}
