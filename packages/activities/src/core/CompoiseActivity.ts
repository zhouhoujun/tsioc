import { Task } from '../decorators/Task';
import { PromiseUtil } from '@tsdi/ioc';
import { Activity } from './Activity';
import { ActivityContext } from './ActivityContext';
import { ActivityType } from './ActivityOption';

/**
 * chain activity.
 *
 * @export
 * @class ChainActivity
 * @extends {ControlActivity}
 */
@Task
export class CompoiseActivity<T extends ActivityContext> extends Activity<T> {

    protected activities: ActivityType<T>[] = [];
    private actions: PromiseUtil.ActionHandle<T>[];

    add(...activities: ActivityType<T>[]): this {
        this.activities.push(...activities);
        this.resetFuncs();
        return this;
    }

    /**
     * use activity.
     *
     * @param {ActivityType} activity
     * @param {boolean} [first]  use action at first or last.
     * @returns {this}
     * @memberof LifeScope
     */
    use(activity: ActivityType<T>, first?: boolean): this {
        if (first) {
            this.activities.unshift(activity);
        } else {
            this.activities.push(activity);
        }
        this.resetFuncs();
        return this;
    }

    /**
     * use activity before
     *
     * @param {ActivityType} activity
     * @param {ActivityType} before
     * @returns {this}
     * @memberof LifeScope
     */
    useBefore(activity: ActivityType<T>, before: ActivityType<T>): this {
        this.activities.splice(this.activities.indexOf(before) - 1, 0, activity);
        this.resetFuncs();
        return this;
    }
    /**
     * use activity after.
     *
     * @param {ActivityType} activity
     * @param {ActivityType} after
     * @returns {this}
     * @memberof LifeScope
     */
    useAfter(activity: ActivityType<T>, after: ActivityType<T>): this {
        this.activities.splice(this.activities.indexOf(after), 0, activity);
        this.resetFuncs();
        return this;
    }

    async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        await this.execActions(ctx, this.getActions(), next);
    }


    protected getActions(): PromiseUtil.ActionHandle<T>[] {
        if (!this.actions) {
            this.actions = this.activities.map(ac => this.toAction(ac))
        }
        return this.actions;
    }

    protected resetFuncs() {
        this.actions = null;
    }
}
