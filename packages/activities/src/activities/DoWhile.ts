import { Task } from '../decorators/Task';
import { Activity, ActivityContext } from '../core';
import { ConditionActivity } from './ConditionActivity';
import { BodyActivity } from './BodyActivity';
import { Input } from '@tsdi/boot';



/**
 * do while control activity.
 *
 * @export
 * @class DoWhileActivity
 * @extends {ContentActivity}
 */
@Task('dowhile')
export class DoWhileActivity<T> extends Activity<T> {
    isScope = true;

    @Input()
    condition: ConditionActivity;

    @Input()
    body: BodyActivity<T>;

    async execute(ctx: ActivityContext): Promise<void> {
        await this.body.run(ctx, async () => {
            await this.condition.run(ctx);
            if (this.condition.result.value) {
                await this.execute(ctx);
            }
        });
    }

}
