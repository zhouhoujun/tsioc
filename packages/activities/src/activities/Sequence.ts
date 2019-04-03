import { Task } from '../decorators/Task';
import { ActivityContext } from '../core';
import { ControlActivity } from './ControlActivity';



/**
 * sequence activity.
 *
 * @export
 * @class SequenceActivity
 * @extends {ControlActivity}
 */
@Task({
    selector: 'sequence'
})
export class SequenceActivity<T extends ActivityContext> extends ControlActivity<T> {

}
