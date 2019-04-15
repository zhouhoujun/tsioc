import { Task } from '../decorators/Task';
import { ActivityContext, Activity, ActivityType, ExecuteOption } from '../core';
import { ControlActivity } from './ControlActivity';
import { isArray } from '@tsdi/ioc';


/**
 * execute activity.
 *
 * @export
 * @class Activity
 * @implements {GActivity<T>}
 * @template T
 */
@Task('execute')
export class ExecuteActivity<T extends ActivityContext> extends ControlActivity<T>  {

    async init(option: ExecuteOption<T>) {
        this.initBody(option.execute);
    }
}
