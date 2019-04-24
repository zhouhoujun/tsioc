import { Activity, ActivityContext, ActivityResult } from '../core';
import { Task } from '../decorators';



/**
 * assign activity.
 *
 * @export
 * @class Assign
 * @extends {Activity<T>}
 * @template T
 */
@Task('assign')
export class AssignActivity<T extends ActivityContext> extends Activity<T> {
    protected async execute(ctx: T): Promise<void> {
        // ctx.assign = await this.resolveSelector<any>(ctx);
    }
}
