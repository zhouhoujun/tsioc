import { Task } from '../decorators/Task';
import { ActivityContext } from '../core';
import { BodyActivity } from './BodyActivity';


/**
 * execute activity.
 *
 * @export
 * @class Activity
 * @implements {GActivity<T>}
 * @template T
 */
@Task('execute')
export class ExecuteActivity<T extends ActivityContext> extends BodyActivity<T>  {

}
