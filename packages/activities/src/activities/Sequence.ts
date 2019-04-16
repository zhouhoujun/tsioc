import { Task } from '../decorators/Task';
import { ActivityContext } from '../core';
import { BodyActivity } from './BodyActivity';

/**
 * sequence activity.
 *
 * @export
 * @class SequenceActivity
 * @extends {ControlActivity}
 */
@Task('sequence')
export class SequenceActivity<T extends ActivityContext> extends BodyActivity<T> {

}
