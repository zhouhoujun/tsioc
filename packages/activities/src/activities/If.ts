import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ActivityContext } from '../core/ActivityContext';
import { ControlActivity } from '../core/ControlActivity';
import { ConditionActivity } from './ConditionActivity';
import { BodyActivity } from './BodyActivity';


export const IFStateKey = 'if-condition';
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

    protected async tryExec(ctx: ActivityContext) {
        await this.condition.run(ctx);
        ctx.status.currentScope.set(IFStateKey, this.condition.result);
        if (this.condition.result) {
            await this.body.run(ctx);
        }
    }
}
