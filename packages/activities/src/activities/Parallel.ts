import { Task } from '../decorators';
import { IActivity, InjectAcitityToken, ParallelConfigure, Active } from '../core';
import { ControlActivity } from './ControlActivity';



/**
 * parallel activity token.
 */
export const ParallelActivityToken = new InjectAcitityToken<ParallelActivity>('parallel');

/**
 * parallel activity.
 *
 * @export
 * @class ParallelActivity
 * @extends {ControlActivity}
 */
@Task(ParallelActivityToken, 'parallel')
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
