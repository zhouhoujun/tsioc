import { Src, Task, Expression } from '@taskfr/core';
import { BuildHandleActivity, BuildHandleContext } from '../BuildHandleActivity';
import { CleanToken, CleanConfigure } from './ICleanActivity';



/**
 * clean task.
 */
@Task(CleanToken)
export class CleanActivity extends BuildHandleActivity {

    /**
     * clean source.
     *
     * @type {Expression<Src>}
     * @memberof CleanActivity
     */
    clean: Expression<Src>;

    async onActivityInit(config: CleanConfigure) {
        await super.onActivityInit(config);
        this.clean = await this.toExpression(config.clean);
    }

    /**
     * run clean.
     *
     * @protected
     * @param {BuildHandleContext<any>} ctx
     * @returns {Promise<void>}
     * @memberof CleanActivity
     */
    protected async compile(ctx: BuildHandleContext<any>): Promise<void> {
        let clean = await ctx.exec(this, this.clean);
        if (clean) {
            await ctx.del(ctx.toRootSrc(clean));
        }
    }
}
