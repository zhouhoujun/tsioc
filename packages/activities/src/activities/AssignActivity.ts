import { Activity, ActivityContext } from '../core';
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
    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        ctx.assign = await this.resolveSelector<any>(ctx);
        next();
    }
}
