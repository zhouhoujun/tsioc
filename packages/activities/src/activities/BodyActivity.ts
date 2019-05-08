import { Task } from '../decorators';
import { ActivityType, CompoiseActivity } from '../core';
import { Input } from '@tsdi/boot';

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

    constructor(@Input() activities: ActivityType[]) {
        super()
        this.activities = activities || [];
    }
}
