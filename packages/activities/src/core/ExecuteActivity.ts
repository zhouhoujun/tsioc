import { Task } from '../decorators/Task';
import { Activity, ActivityType } from './Activity';
import { ActivityContext } from './ActivityContext';


/**
 * execute activity.
 *
 * @export
 * @class Activity
 * @implements {GActivity<T>}
 * @template T
 */
@Task({
    selector: 'execute'
})
export class ExecuteActivity<T extends ActivityContext> extends Activity<T>  {

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let exec = await this.resolveSelector<ActivityType<T>>(ctx);
        await this.execActions(ctx, [exec], next);
    }
}
