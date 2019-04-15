import { Task } from '../decorators/Task';
import { ActivityContext, ActivityType } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * while control activity.
 *
 * @export
 * @class TryCatchActivity
 * @extends {ControlActivity}
 */
@Task('try')
export class TryCatchActivity<T extends ActivityContext> extends ControlActivity<T> {

    catchs: ActivityType<T>[];
    finallies: ActivityType<T>[];

    async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        try {
            await super.execute(ctx, next);
        } catch (err) {
            await this.execActivity(ctx, this.catchs, next);
        } finally {
            await this.execActivity(ctx, this.finallies, next);
        }
    }
}
