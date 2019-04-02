import { Task } from '../decorators/Task';
import { ControlActivity } from './ControlActivity';
import { ActivityContext } from '../core';

/**
 * handle activity base.
 *
 * @export
 * @abstract
 * @class HandleActivity
 * @extends {ControlActivity}
 * @implements {HandleActivity}
 */
@Task(ControlActivity, 'handle')
export abstract class HandleActivity extends ControlActivity {

    /**
     * run context.
     *
     * @param {IActivityContext} [ctx]
     * @param {() => Promise<any>} [next]
     * @returns {Promise<any>}
     * @memberof HandleActivity
     */
    async run<T>(ctx?: ActivityContext<T>, next?: () => Promise<any>): Promise<ActivityContext<T>> {
        this.verifyCtx(ctx);
        await this.execute(next);
        return this.context;
    }

    /**
     * execute via ctx.
     *
     * @protected
     * @abstract
     * @param {() => Promise<any>} [next]
     * @returns {Promise<void>}
     * @memberof HandleActivity
     */
    protected abstract async execute(next?: () => Promise<any>): Promise<void>;
}
