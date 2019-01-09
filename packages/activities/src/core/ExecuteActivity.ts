import { Task } from '../decorators/Task';
import { Activity } from './Activity';
import { IActivityResult, InjectAcitityToken } from './IActivity';
import { OnActivityInit } from './OnActivityInit';
import { IActivityContextResult, IActivityContext } from './IActivityContext';
import { ExecuteConfigure } from './ActivityConfigure';


export const ExecuteToken = new InjectAcitityToken<ExecuteActivity<any>>('Execute')

/**
 * execute activity.
 *
 * @export
 * @class Activity
 * @implements {GActivity<T>}
 * @template T
 */
@Task(ExecuteToken)
export class ExecuteActivity<T> extends Activity implements IActivityResult<T>, OnActivityInit {
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

    protected async execute(): Promise<void> {
        let cfg = this.context.config as ExecuteConfigure;
        if (cfg.execute) {
            await this.execActivity(cfg.execute, this.context);
        }
    }
}
