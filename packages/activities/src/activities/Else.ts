import { Task } from '../decorators';
import { ActivityContext, Activity } from '../core';
import { BodyActivity } from './BodyActivity';
import { ElseIfActivity } from './ElseIf';
import { IfActivity } from './If';
import { Input } from '@tsdi/boot';

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

    @Input()
    body: BodyActivity<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let curr = ctx.runnable.status.currentScope;
        if (curr && curr.subs.length) {
            let activity = curr.subs.find(a => a instanceof ElseIfActivity || a instanceof IfActivity);
            if (activity && !activity.result.value) {
                await this.body.run(ctx);
            }
        }
    }
}
