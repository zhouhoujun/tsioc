import { Task } from '../decorators/Task';
import { ActivityContext, SequenceOption } from '../core';
import { ControlActivity } from './ControlActivity';

/**
 * sequence activity.
 *
 * @export
 * @class SequenceActivity
 * @extends {ControlActivity}
 */
@Task('sequence')
export class SequenceActivity<T extends ActivityContext> extends ControlActivity<T> {
    async init(option: SequenceOption<T>) {
        this.initBody(option.sequence);
    }
}
