import { tokenId } from '@tsdi/ioc';
import { Input, BindingTypes } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ActivityContext } from '../core/ActivityContext';
import { ControlActivity } from '../core/ControlActivity';
import { ConditionActivity } from './ConditionActivity';
import { ActivityType } from '../core/ActivityMetadata';


export const IFStateKey = tokenId<boolean>('if-condition');
/**
 * if control activity.
 *
 * @export
 * @class IfActivity
 * @extends {ControlActivity}
 */
@Task('if')
export class IfActivity extends ControlActivity {

    @Input() condition: ConditionActivity;

    @Input({ bindingType: BindingTypes.dynamic }) body: ActivityType<any>;

    async execute(ctx: ActivityContext): Promise<void> {
        await this.tryExec(ctx);
    }

    protected async tryExec(ctx: ActivityContext) {
        let result = await this.condition?.execute(ctx);
        ctx.runScope.setValue(IFStateKey, result);
        if (result) {
            await ctx.getExector().runActivity(this.body);
        }
    }
}
