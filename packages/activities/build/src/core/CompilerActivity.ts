import { BuildHandleContext, HandleContextToken } from './BuildHandleActivity';
import { Task, ActivityContextToken } from '@taskfr/core';
import { NodeActivity } from './NodeActivity';
import { Providers } from '@ts-ioc/core';


/**
 * compiler activity.
 *
 * @export
 * @abstract
 * @class CompilerActivity
 * @extends {NodeActivity}
 */
@Task
@Providers([
    { provide: ActivityContextToken,  useExisting: HandleContextToken }
])
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
