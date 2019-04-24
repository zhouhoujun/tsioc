import { ActivityContext, Activity } from '../core';
import { Task } from '../decorators/Task';

/**
 * dependence activity.
 *
 * @export
 * @class DependenceActivity
 * @extends {ControlActivity}
 */
@Task('dependence')
export class DependenceActivity<T extends ActivityContext> extends Activity<T> {

    /**
     * execute body.
     *
     * @protected
     * @memberof DependenceActivity
     */
    async run(ctx: T, next: () => Promise<void>): Promise<void> {
        // let dependence = await this.resolveSelector<Activity<T>>(ctx);
        // await this.execActivity(ctx, [dependence]);
        // await super.execute(ctx, next);
    }
}
