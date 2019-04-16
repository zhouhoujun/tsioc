import { Task } from '../decorators/Task';
import { ActivityContext, ActivityType, Activity } from '../core';


/**
 * while control activity.
 *
 * @export
 * @class TryCatchActivity
 * @extends {ControlActivity}
 */
@Task('try')
export class TryCatchActivity<T extends ActivityContext> extends Activity<T> {
    try: ActivityType<T>[];
    catchs: ActivityType<T>[];
    finallies: ActivityType<T>[];

    async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        try {
            await this.execActivity(ctx, this.try, next);
        } catch (err) {
            await this.execActivity(ctx, this.catchs, next);
        } finally {
            await this.execActivity(ctx, this.finallies, next);
        }
    }
}
