import { Task } from '../decorators/Task';
import { ActivityContext, CompoiseActivity, ActivityType } from '../core';
import { Inject } from '@tsdi/ioc';
import { ContainerToken, IContainer } from '@tsdi/core';



/**
 * parallel activity.
 *
 * @export
 * @class ParallelActivity
 * @extends {ControlActivity}
 */
@Task('parallel')
export class ParallelActivity<T> extends CompoiseActivity<T> {

    constructor(
        @Inject('parallel') activities: ActivityType[],
        @Inject(ContainerToken) container: IContainer) {
        super(container)
        this.activities = activities || [];
    }
    /**
     * execute parallel.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof ParallelActivity
     */
    async execute(ctx: ActivityContext): Promise<void> {
        await Promise.all(this.activities.map(act => this.execActivity(ctx, act)));
    }
}
