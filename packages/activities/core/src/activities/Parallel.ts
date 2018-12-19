import { Task } from '../decorators';
import { IActivity, InjectAcitityToken, ParallelConfigure, ActivityType } from '../core';
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
@Task(ParallelActivityToken)
export class ParallelActivity extends ControlActivity {

    /**
     * activites
     *
     * @type {IActivity[]}
     * @memberof ParallelActivity
     */
    activities: IActivity[] = [];

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
            await this.buildChildren(this, config.parallel);
        }
    }

    async buildChildren(activity: ParallelActivity, configs: ActivityType<IActivity>[]) {
        let children = await Promise.all(configs.map(cfg => this.buildActivity(cfg)));
        activity.activities = children;
        return activity;
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
