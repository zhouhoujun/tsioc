import { ActivityContext, Activity } from '../core';
import { Task } from '../decorators/Task';
import { ControlActivity } from './ControlActivity';

/**
 * dependence activity.
 *
 * @export
 * @class DependenceActivity
 * @extends {ControlActivity}
 */
@Task('dependence')
export class DependenceActivity<T extends ActivityContext> extends ControlActivity<T> {

    /**
     * execute body.
     *
     * @protected
     * @memberof DependenceActivity
     */
    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let dependence = await this.resolveSelector<Activity<T>>(ctx);
        await this.execActivity(ctx, [dependence]);
        await super.execute(ctx, next);
    }
}
