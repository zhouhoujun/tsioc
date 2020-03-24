import { AsyncHandler } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ControlActivity } from '../core/ControlActivity';
import { IActivityContext } from '../core/IActivityContext';
import { ConditionActivity } from './ConditionActivity';
import { IWorkflowContext } from '../core/IWorkflowContext';
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

    @Input({ bindingType: 'dynamic' }) body: ActivityType<any>;

    private action: AsyncHandler<IWorkflowContext> | AsyncHandler<IWorkflowContext>[];

    async execute(ctx: IActivityContext): Promise<void> {
        if (!this.action) {
            this.action = ctx.getExector().parseAction(this.body);
        }
        await ctx.getExector().execAction(this.action, async () => {
            let condition = await this.condition?.execute(ctx);
            if (condition) {
                await this.execute(ctx);
            }
        });
    }
}
