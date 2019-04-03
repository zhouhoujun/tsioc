import { ExecuteActivity } from './ExecuteActivity';
import { ActivityContext } from './ActivityContext';


/**
 * assign activity.
 *
 * @export
 * @class Assign
 * @extends {Activity<T>}
 * @template T
 */
export abstract class AssignActivity<T extends ActivityContext> extends ExecuteActivity<T> {

}
