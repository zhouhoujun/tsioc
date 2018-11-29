import { BuildHandleContext } from './BuildHandleActivity';
import { Task, ActivityConfigure } from '@taskfr/core';
import { CompilerToken } from './BuildHandle';
import { NodeActivity } from './NodeActivity';


/**
 * compiler configure.
 *
 * @export
 * @interface CompilerConfigure
 * @extends {ActivityConfigure}
 */
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
     * compile context.
     *
     * @returns {CompilerHandleContext}
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
