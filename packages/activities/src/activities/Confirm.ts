import { Input } from '@tsdi/components';
import { Task } from '../decor';
import { ConditionActivity } from './ConditionActivity';
import { ControlActivity } from '../core/ControlActivity';
import { IActivityContext } from '../core/IActivityContext';
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

    @Input({ bindingType: 'dynamic' }) body: ActivityType<any>;

    async execute(ctx: IActivityContext): Promise<void> {
        let result = await this.condition.execute(ctx);
        if (result) {
            await ctx.getExector().runActivity(this.body);
        }
    }
}
