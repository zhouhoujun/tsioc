import { Input, BindingTypes } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ControlActivity } from '../core/ControlActivity';
import { ActivityContext } from '../core/ActivityContext';
import { ConditionActivity } from './ConditionActivity';
import { WorkflowContext } from '../core/WorkflowInstance';
import { PromiseUtil } from '@tsdi/ioc';
import { ActivityType } from '../core/ActivityMetadata';



/**
 * do while control activity.
 *
 * @export
 * @class DoWhileActivity
 * @extends {ContentActivity}
 */
@Task('dowhile')
export class DoWhileActivity extends ControlActivity {

    @Input() condition: ConditionActivity;

    @Input({ bindingType: BindingTypes.dynamic }) body: ActivityType<any>;

    private action: PromiseUtil.ActionHandle<WorkflowContext>;

    async execute(ctx: ActivityContext): Promise<void> {
        if (!this.action) {
            this.action = ctx.getExector().parseAction(this.body);
        }
        await this.action(ctx.workflow, async () => {
            let condition = await this.condition.execute(ctx);
            if (condition) {
                await this.execute(ctx);
            }
        });
    }

}
