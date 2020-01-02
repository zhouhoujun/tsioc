import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ActivityContext } from '../core/ActivityContext';
import { ControlActivity } from '../core/ControlActivity';
import { ConditionActivity } from './ConditionActivity';
import { BodyActivity } from './BodyActivity';


/**
 * while control activity.
 *
 * @export
 * @class WhileActivity
 * @extends {ControlActivity}
 */
@Task('while')
export class WhileActivity<T> extends ControlActivity<T> {

    @Input() condition: ConditionActivity;

    @Input() body: BodyActivity<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        await this.condition.run(ctx);
        if (this.condition.result) {
            await this.body.run(ctx, async () => {
                await this.condition.run(ctx);
                if (this.condition.result) {
                    await this.execute(ctx);
                }
            });
        }
    }
}
