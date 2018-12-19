import { Task } from '../decorators';
import { IActivity, InjectAcitityToken, SequenceConfigure, ActivityType } from '../core';
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
@Task(SequenceActivityToken)
export class SequenceActivity extends ControlActivity {

    /**
     * sequence activites.
     *
     * @type {IActivity[]}
     * @memberof SequenceActivity
     */
    activities: IActivity[] = [];

    async onActivityInit(config: SequenceConfigure): Promise<void> {
        await super.onActivityInit(config);
        this.activities = this.activities || [];
        if (config.sequence && config.sequence.length) {
            await this.buildChildren(this, config.sequence);
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

    async buildChildren(activity: SequenceActivity, configs: ActivityType<IActivity>[]) {
        let sequence = await Promise.all(configs.map(cfg => this.buildActivity(cfg)));
        activity.activities = sequence;
        return activity;
    }

    protected async execute(): Promise<void> {
        let execPromise = Promise.resolve(this.context);
        this.activities.forEach(act => {
            execPromise = execPromise.then(ctx => this.execActivity(act, ctx));
        });
        await execPromise;
    }
}
