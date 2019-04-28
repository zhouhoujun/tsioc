import { Task } from '../decorators/Task';
import { CompoiseActivity, ActivityType } from '../core';
import { Inject } from '@tsdi/ioc';
import { ContainerToken, IContainer } from '@tsdi/core';

/**
 * sequence activity.
 *
 * @export
 * @class SequenceActivity
 * @extends {ControlActivity}
 */
@Task('sequence')
export class SequenceActivity<T> extends CompoiseActivity<T> {

    constructor(
        @Inject('sequence') activities: ActivityType[],
        @Inject(ContainerToken) container: IContainer) {
        super(container)
        this.activities = activities || [];
    }

}
