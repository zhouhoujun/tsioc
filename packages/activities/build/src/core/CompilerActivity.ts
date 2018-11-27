import { BuildHandleContext } from './BuildHandleContext';
import { Task, ActivityConfigure } from '@taskfr/core';
import { CompilerToken } from './BuildHandle';
import { NodeActivity } from './NodeActivity';


export interface  CompilerConfigure  extends ActivityConfigure {

}

/**
 * compiler activity.
 *
 * @export
 * @abstract
 * @class CompilerActivity
 * @extends {NodeActivity}
 */
@Task(CompilerToken)
export abstract class CompilerActivity extends NodeActivity {

    /**
     * get context.
     *
     * @returns {CompilerHandleContext}
     * @memberof CompilerActivity
     */
    getContext(): BuildHandleContext<any> {
        return super.getContext() as BuildHandleContext<any>;
    }

    protected verifyCtx(ctx?: any) {
        if (ctx instanceof BuildHandleContext) {
            this._ctx = ctx;
        } else {
            this.getContext().setAsResult(ctx);
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
