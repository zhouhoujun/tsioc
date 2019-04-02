import { Task } from '../decorators/Task';
import { Activity } from './Activity';
import { OnActivityInit } from './OnActivityInit';
import { ExecuteConfigure } from './ActivityConfigure';
import { ActivityContext } from './ActivityContext';


/**
 * execute activity.
 *
 * @export
 * @class Activity
 * @implements {GActivity<T>}
 * @template T
 */
@Task
export class ExecuteActivity<T> extends Activity implements OnActivityInit {
    /**
     *  activity execute context.
     *
     * @type {ActivityContext}
     * @memberof Activity
     */
    context: ActivityContext<T>;

    /**
     * run task.
     *
     * @param {ActivityContext} [ctx] execute context.
     * @returns {Promise<T>}
     * @memberof Activity
     */
    async run(ctx?: ActivityContext<T>): Promise<ActivityContext<T>> {
        this.verifyCtx(ctx);
        await this.execute();
        return this.context;
    }

    protected async execute(): Promise<void> {
        let cfg = this.context.config as ExecuteConfigure;
        if (cfg.execute) {
            await this.execActivity(cfg.execute, this.context);
        }
    }
}
