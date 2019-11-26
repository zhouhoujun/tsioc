import { Input } from '@tsdi/components';
import { Task } from '../decorators';
import { ActivityContext, ControlActivity, CTX_CONDITION_RESULT } from '../core';
import { BodyActivity } from './BodyActivity';

/**
 * else activity.
 *
 * @export
 * @class ElseActivity
 * @extends {ConditionActivity<T>}
 * @template T
 */
@Task('else')
export class ElseActivity<T> extends ControlActivity<T> {

    @Input() body: BodyActivity<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        if (ctx.has(CTX_CONDITION_RESULT) && !ctx.get(CTX_CONDITION_RESULT)) {
            await this.body.run(ctx);
        }
    }
}
