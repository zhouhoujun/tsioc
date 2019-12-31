import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ActivityType } from '../core/ActivityMetadata';
import { CompoiseActivity } from '../core/CompoiseActivity';

/**
 * sequence activity.
 *
 * @export
 * @class SequenceActivity
 * @extends {ControlActivity}
 */
@Task('sequence')
export class SequenceActivity<T> extends CompoiseActivity<T> {

    @Input() activities: ActivityType[];

}
