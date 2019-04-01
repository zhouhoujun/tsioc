import { Task } from '../decorators/Task';
import { ParallelConfigure } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * parallel activity.
 *
 * @export
 * @class ParallelActivity
 * @extends {ControlActivity}
 */
@Task(ControlActivity, 'parallel')
export class ParallelActivity extends ControlActivity {

    /**
     * execute parallel.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof ParallelActivity
     */
    protected async execute(): Promise<void> {
        let config = this.context.config as ParallelConfigure;
        if (config.parallel && config.parallel.length) {
            await Promise.all(config.parallel.map(act => this.execActivity(act, this.context)));
        }
    }
}
