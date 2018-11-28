import { Task } from '../decorators';
import { Activity } from './Activity';
import { IActivityResult } from './IActivity';
import { OnActivityInit } from './OnActivityInit';
import { IActivityContextResult, IActivityContext } from './IActivityContext';

/**
 * execute activity.
 *
 * @export
 * @class Activity
 * @implements {GActivity<T>}
 * @template T
 */
@Task
export abstract class ExecuteActivity<T> extends Activity implements IActivityResult<T>, OnActivityInit {

    /**
     *  activity execute context.
     *
     * @type {ActivityContext}
     * @memberof Activity
     */
    context: IActivityContextResult<T>;

    /**
     * run task.
     *
     * @param {ActivityContext} [ctx] execute context.
     * @returns {Promise<T>}
     * @memberof Activity
     */
    async run(ctx?: IActivityContext): Promise<IActivityContextResult<T>> {
        this.verifyCtx(ctx);
        await this.execute();
        return this.context;
    }

}
