import { BuildHandleContext } from './BuildHandleActivity';
import { Task } from '@taskfr/core';
import { NodeActivity } from './NodeActivity';


/**
 * compiler activity.
 *
 * @export
 * @abstract
 * @class CompilerActivity
 * @extends {NodeActivity}
 */
@Task
export abstract class CompilerActivity extends NodeActivity {

    /**
     * compile context.
     *
     * @type {BuildHandleContext<any>}
     * @memberof CompilerActivity
     */
    context: BuildHandleContext<any>;

    protected verifyCtx(ctx?: any) {
        if (ctx instanceof BuildHandleContext) {
            this.context = ctx;
        } else {
            this.setResult(ctx);
        }
    }
    /**
     * execute build activity.
     *
     * @protected
     * @abstract
     * @returns {Promise<void>}
     * @memberof NodeActivity
     */
    protected abstract async execute(): Promise<void>;
}
