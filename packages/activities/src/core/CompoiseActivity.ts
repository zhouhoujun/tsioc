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

    protected activities: ActivityType<T>[];
    private actions: PromiseUtil.ActionHandle<T>[];


    onInit() {
        this.activities = [];
    }

    /**
     * use handle.
     *
     * @param {ActivityType} handle
     * @param {boolean} [first]  use action at first or last.
     * @returns {this}
     * @memberof LifeScope
     */
    use(handle: ActivityType<T>, first?: boolean): this {
        if (first) {
            this.activities.unshift(handle);
        } else {
            this.activities.push(handle);
        }
        this.resetFuncs();
        return this;
    }

    /**
     * use handle before
     *
     * @param {ActivityType} handle
     * @param {ActivityType} before
     * @returns {this}
     * @memberof LifeScope
     */
    useBefore(handle: ActivityType<T>, before: ActivityType<T>): this {
        this.activities.splice(this.activities.indexOf(before) - 1, 0, handle);
        this.resetFuncs();
        return this;
    }
    /**
     * use handle after.
     *
     * @param {ActivityType} handle
     * @param {ActivityType} after
     * @returns {this}
     * @memberof LifeScope
     */
    useAfter(handle: ActivityType<T>, after: ActivityType<T>): this {
        this.activities.splice(this.activities.indexOf(after), 0, handle);
        this.resetFuncs();
        return this;
    }

    async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (!this.actions) {
            this.actions = this.activities.map(ac => this.toAction(ac))
        }
        await this.execActions(ctx, this.actions, next);
    }

    protected resetFuncs() {
        this.actions = null;
    }
}
