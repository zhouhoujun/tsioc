import { Task } from '../decorators/Task';
import { ActivityContext } from '../core';
import { ConditionActivity } from './ConditionActivity';


/**
 * while control activity.
 *
 * @export
 * @class ConfirmActivity
 * @extends {ControlActivity}
 */
@Task('confirm')
export class ConfirmActivity<T extends ActivityContext> extends ConditionActivity<T> {

}
