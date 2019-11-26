import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ActivityContext, ControlActivity } from '../core';
import { ConditionActivity } from './ConditionActivity';
import { BodyActivity } from './BodyActivity';



/**
 * do while control activity.
 *
 * @export
 * @class DoWhileActivity
 * @extends {ContentActivity}
 */
@Task('dowhile')
export class DoWhileActivity<T> extends ControlActivity<T> {

    @Input() condition: ConditionActivity;

    @Input() body: BodyActivity<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        await this.body.run(ctx, async () => {
            await this.condition.run(ctx);
            if (this.condition.result.value) {
                await this.execute(ctx);
            }
        });
    }

}
