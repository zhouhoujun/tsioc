import { Input, BindingTypes } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ConditionActivity } from './ConditionActivity';
import { ControlActivity } from '../core/ControlActivity';
import { ActivityContext } from '../core/ActivityContext';
import { ActivityType } from '../core/ActivityMetadata';



/**
 * while control activity.
 *
 * @export
 * @class ConfirmActivity
 * @extends {ControlActivity}
 */
@Task('confirm')
export class ConfirmActivity extends ControlActivity {

    @Input() condition: ConditionActivity;

    @Input({ bindingType: BindingTypes.dynamic }) body: ActivityType<any>;

    async execute(ctx: ActivityContext): Promise<void> {
        let result = await this.condition.execute(ctx);
        if (result) {
            await ctx.getExector().runActivity(this.body);
        }
    }
}
