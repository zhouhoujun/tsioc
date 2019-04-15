import { Task } from '../decorators/Task';
import { ActivityContext, DoWhileActivityOption } from '../core';
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

    async init(option: DoWhileActivityOption<T>) {
        this.initCondition(option.dowhile);
    }

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        await this.execActions(ctx);
        await super.execute(ctx, next);
    }

    protected async whenTrue(ctx: T, next?: () => Promise<void>): Promise<void> {
        await super.execute(ctx, async () => {
            await super.execute(ctx, next);
        });
    }

}
