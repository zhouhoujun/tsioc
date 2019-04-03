
import { Task } from '../decorators/Task';
import { ActivityContext, ActivityType } from '../core';
import { PromiseUtil } from '@tsdi/ioc';
import { Activity } from './Activity';


/**
 * chain activity.
 *
 * @export
 * @class ChainActivity
 * @extends {ControlActivity}
 */
@Task
export class CompoiseActivity<T extends ActivityContext> extends Activity<T> {

    protected handles: ActivityType<T>[];
    private funcs: PromiseUtil.ActionHandle<T>[];

    onInit() {
        this.handles = [];
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
            this.handles.unshift(handle);
        } else {
            this.handles.push(handle);
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
        this.handles.splice(this.handles.indexOf(before) - 1, 0, handle);
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
        this.handles.splice(this.handles.indexOf(after), 0, handle);
        this.resetFuncs();
        return this;
    }

    async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (!this.funcs) {
            this.funcs = this.handles.map(ac => this.toFunc(ac))
        }
        await this.execActions(ctx, this.funcs, next);
    }

    protected resetFuncs() {
        this.funcs = null;
    }
}
