import { Task } from '../decorators/Task';
import { BodyActivity } from './BodyActivity';
import { ActivityContext } from '../core';
import { ConditionActivity } from './ConditionActivity';
import { Input } from '@tsdi/components';
import { ControlActivity } from './ControlActivity';



/**
 * while control activity.
 *
 * @export
 * @class ConfirmActivity
 * @extends {ControlActivity}
 */
@Task('confirm')
export class ConfirmActivity<T> extends ControlActivity<T> {

    @Input() condition: ConditionActivity;

    @Input() body: BodyActivity<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        await this.condition.run(ctx);
        if (this.condition.result.value) {
            await this.body.run(ctx)
        }
    }
}
