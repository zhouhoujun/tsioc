import { Task } from '../decorators';
import { ActivityType, CompoiseActivity } from '../core';
import { Inject } from '@tsdi/ioc';

/**
 * body activity.
 *
 * @export
 * @class BodyActivity
 * @extends {ControlActivity<T>}
 * @template T
 */
@Task('[body]')
export class BodyActivity<T> extends CompoiseActivity<T> {

    constructor(@Inject('[body]') activities: ActivityType[]) {
        super()
        this.activities = activities || [];
    }
}
