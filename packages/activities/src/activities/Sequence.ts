import { Task } from '../decorators/Task';
import { InjectAcitityToken, SequenceConfigure } from '../core';
import { ControlActivity } from './ControlActivity';

/**
 * sequence activity token
 */
export const SequenceActivityToken = new InjectAcitityToken<SequenceActivity>('sequence');

/**
 * sequence activity.
 *
 * @export
 * @class SequenceActivity
 * @extends {ControlActivity}
 */
@Task(SequenceActivityToken, 'sequence')
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
