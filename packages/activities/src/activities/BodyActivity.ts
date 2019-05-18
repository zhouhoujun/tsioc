import { Task } from '../decorators';
import { ActivityType, CompoiseActivity } from '../core';
import { Input } from '@tsdi/boot';
import { isArray } from '@tsdi/ioc';

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
    constructor(@Input('body') activities: ActivityType | ActivityType[]) {
        super()
        this.activities = isArray(activities) ? activities : [activities];
    }
}
