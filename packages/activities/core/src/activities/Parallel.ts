import { Task } from '../decorators';
import { IActivity, InjectAcitityToken, ParallelConfigure, ActivityType, Active } from '../core';
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
     * activites
     *
     * @type {Active[]}
     * @memberof ParallelActivity
     */
    activities: Active[] = [];

    /**
     * add activity.
     *
     * @param {IActivity} activity
     * @memberof ParallelActivity
     */
    add(activity: IActivity) {
        this.activities.push(activity);
    }

    async onActivityInit(config: ParallelConfigure): Promise<any> {
        await super.onActivityInit(config);
        if (config.parallel && config.parallel.length) {
            this.activities.push(...config.parallel);
        }
    }

    /**
     * execute parallel.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof ParallelActivity
     */
    protected async execute(): Promise<void> {
        await Promise.all(this.activities.map(act => this.execActivity(act, this.context)));
    }
}
