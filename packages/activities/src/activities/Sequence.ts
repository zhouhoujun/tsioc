import { Task } from '../decorators/Task';
import { SequenceConfigure } from '../core';
import { ControlActivity } from './ControlActivity';



/**
 * sequence activity.
 *
 * @export
 * @class SequenceActivity
 * @extends {ControlActivity}
 */
@Task(ControlActivity, 'sequence')
export class SequenceActivity extends ControlActivity {

    protected async execute(): Promise<void> {
        let config = this.context.config as SequenceConfigure;
        if (config.sequence && config.sequence.length) {
            let execPromise = Promise.resolve(this.context);
            (config.sequence || []).forEach(act => {
                execPromise = execPromise.then(ctx => this.execActivity(act, ctx));
            });
            await execPromise;
        }
    }
}
