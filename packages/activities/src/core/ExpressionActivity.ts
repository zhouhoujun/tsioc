import { ExecuteActivity } from './ExecuteActivity';
import { ActivityContext } from './ActivityContext';

/**
 * expression activity.
 *
 * @export
 * @abstract
 * @class ExpressionActivity
 * @extends {ExecuteActivity<T>}
 * @template T
 */
export abstract class ExpressionActivity<T extends ActivityContext> extends ExecuteActivity<T> {

}
