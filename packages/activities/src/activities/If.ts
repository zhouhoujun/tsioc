import { Input } from '@tsdi/components';
import { Task } from '../decorators';
import { ActivityContext, ControlActivity, CTX_CONDITION_RESULT } from '../core';
import { ConditionActivity } from './ConditionActivity';
import { BodyActivity } from './BodyActivity';

/**
 * if control activity.
 *
 * @export
 * @class IfActivity
 * @extends {ControlActivity}
 */
@Task('if')
export class IfActivity<T = any> extends ControlActivity<T> {

    @Input() condition: ConditionActivity;

    @Input() body: BodyActivity<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        await this.tryExec(ctx);
    }

    setCtrlState(ctx: ActivityContext) {
        ctx.set(CTX_CONDITION_RESULT, this.condition.result.value);
    }

    cleanCtrlState(ctx: ActivityContext) {
        ctx.remove(CTX_CONDITION_RESULT);
    }

    protected async tryExec(ctx: ActivityContext) {
        await this.condition.run(ctx);
        this.setCtrlState(ctx);
        if (this.condition.result.value) {
            await this.body.run(ctx);
        }
    }
}
