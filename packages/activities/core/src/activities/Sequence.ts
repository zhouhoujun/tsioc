import { Task } from '../decorators';
import { IActivity, InjectAcitityToken, SequenceConfigure, Active } from '../core';
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

    /**
     * sequence activites.
     *
     * @type {Active[]}
     * @memberof SequenceActivity
     */
    activities: Active[] = [];

    async onActivityInit(config: SequenceConfigure): Promise<void> {
        await super.onActivityInit(config);
        this.activities = this.activities || [];
        if (config.sequence && config.sequence.length) {
            this.activities.push(...config.sequence);
        }
    }

    /**
     * add activity.
     *
     * @param {IActivity} activity
     * @memberof SequenceActivity
     */
    add(activity: IActivity) {
        this.activities.push(activity);
    }


    protected async execute(): Promise<void> {
        let execPromise = Promise.resolve(this.context);
        this.activities.forEach(act => {
            execPromise = execPromise.then(ctx => this.execActivity(act, ctx));
        });
        await execPromise;
    }
}
