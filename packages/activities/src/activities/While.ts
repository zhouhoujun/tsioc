import { Input } from '@tsdi/components';
import { Task } from '../metadata/decor';
import { IActivityContext } from '../core/IActivityContext';
import { ControlActivity } from '../core/ControlActivity';
import { ConditionActivity } from './ConditionActivity';
import { ActivityType } from '../core/ActivityMetadata';
import { AsyncHandler } from '@tsdi/ioc';
import { WorkflowContext } from '../core/WorkflowContext';

/**
 * while control activity.
 *
 * @export
 * @class WhileActivity
 * @extends {ControlActivity}
 */
@Task('while')
export class WhileActivity extends ControlActivity {

    @Input() condition: ConditionActivity;

    @Input({ bindingType: 'dynamic' }) body: ActivityType<any>;

    private action: AsyncHandler<WorkflowContext> | AsyncHandler<WorkflowContext>[];

    async execute(ctx: IActivityContext): Promise<void> {
        let condition = await this.condition?.execute(ctx);
        if (condition) {
            if (!this.action) {
                this.action = ctx.getExector().parseAction(this.body);
            }
            await ctx.getExector().execAction(this.action, async () => {
                condition = await this.condition?.execute(ctx);
                if (condition) {
                    await this.execute(ctx);
                }
            });
        }
    }
}
