import { Task } from '../decorators/Task';
import { ActivityContext } from '../core';
import { ConditionActivity } from './ConditionActivity';


/**
 * while control activity.
 *
 * @export
 * @class WhileActivity
 * @extends {ControlActivity}
 */
@Task('while')
export class WhileActivity<T extends ActivityContext> extends ConditionActivity<T> {

    protected async whenTrue(ctx: T, next?: () => Promise<void>): Promise<void> {
        await this.execBody(ctx, () => {
            return this.run(ctx, next);
        });
    }
}
