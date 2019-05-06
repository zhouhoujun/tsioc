import { Task } from '../decorators/Task';
import { BodyActivity } from './BodyActivity';
import { ActivityContext, Activity } from '../core';
import { ConditionActivity } from './ConditionActivity';
import { Input } from '@tsdi/boot';



/**
 * while control activity.
 *
 * @export
 * @class ConfirmActivity
 * @extends {ControlActivity}
 */
@Task('confirm')
export class ConfirmActivity<T> extends Activity<T> {

    @Input()
    condition: ConditionActivity;

    @Input()
    body: BodyActivity<T>;

    async execute(ctx: ActivityContext): Promise<void> {
        await this.condition.run(ctx);
        if (this.condition.result.value) {
            await this.body.run(ctx)
        }
    }
}
