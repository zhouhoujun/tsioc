import { Task } from '../decorators';
import { IActivityContext, IHandleActivity } from '../core';
import { ControlActivity } from './ControlActivity';

/**
 * handle activity base.
 *
 * @export
 * @abstract
 * @class HandleActivity
 * @extends {ControlActivity}
 * @implements {IHandleActivity}
 */
@Task
export abstract class HandleActivity extends ControlActivity implements IHandleActivity {

    /**
     * run context.
     *
     * @param {IActivityContext} [ctx]
     * @param {() => Promise<any>} [next]
     * @returns {Promise<any>}
     * @memberof HandleActivity
     */
    async run(ctx?: IActivityContext, next?: () => Promise<any>): Promise<IActivityContext> {
        this.verifyCtx(ctx);
        await this.execute(next);
        return this.getContext()
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
