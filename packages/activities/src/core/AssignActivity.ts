import { Task } from '../decorators/Task';
import { ExecuteActivity } from './ExecuteActivity';


/**
 * assign activity.
 *
 * @export
 * @class Assign
 * @extends {Activity<T>}
 * @template T
 */
@Task
export abstract class AssignActivity<T> extends ExecuteActivity<T> {

}
