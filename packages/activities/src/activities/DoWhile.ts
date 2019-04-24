import { Task } from '../decorators/Task';
import { ActivityContext } from '../core';
import { ConditionActivity } from './ConditionActivity';


/**
 * do while control activity.
 *
 * @export
 * @class DoWhileActivity
 * @extends {ContentActivity}
 */
@Task('dowhile')
export class DoWhileActivity<T extends ActivityContext> extends ConditionActivity<T> {

    async run(ctx: T, next: () => Promise<void>): Promise<void> {
        await this.execBody(ctx);
        await super.run(ctx, next);
    }

    protected async whenTrue(ctx: T, next?: () => Promise<void>): Promise<void> {
        await this.execBody(ctx, async () => {
            await super.run(ctx, next);
        });
    }

}
