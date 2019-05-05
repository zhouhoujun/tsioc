import { Task } from '../decorators/Task';
import { CompoiseActivity, ActivityType } from '../core';
import { Inject } from '@tsdi/ioc';

/**
 * sequence activity.
 *
 * @export
 * @class SequenceActivity
 * @extends {ControlActivity}
 */
@Task('sequence')
export class SequenceActivity<T> extends CompoiseActivity<T> {

    constructor(@Inject('sequence') activities: ActivityType[]) {
        super()
        this.activities = activities || [];
    }

}
