import { Task } from '../decorators';
import { ActivityContext } from '../core';
import { BodyActivity } from './BodyActivity';
import { IfActivity } from './If';
import { Input } from '@tsdi/components';
import { ControlerActivity } from './ControlerActivity';

/**
 * else activity.
 *
 * @export
 * @class ElseActivity
 * @extends {ConditionActivity<T>}
 * @template T
 */
@Task('else')
export class ElseActivity<T extends ActivityContext> extends ControlerActivity<T> {

    @Input()
    body: BodyActivity<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let curr = ctx.runnable.status.currentScope;
        if (curr && curr.subs.length) {
            let activity = curr.subs.find(a => a instanceof IfActivity) as IfActivity<any>;
            if (activity && !activity.condition.result.value) {
                await this.body.run(ctx);
            }
        }
    }
}
