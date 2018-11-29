import { Src, InjectAcitityToken, Task, Expression, ExpressionType } from '@taskfr/core';
import { BuildHandleActivity, BuildHandleConfigure, BuildHandleContext } from '../BuildHandleActivity';



/**
 * clean task token.
 */
export const CleanToken = new InjectAcitityToken<CleanActivity>('clean');

/**
 * clean configure
 *
 * @export
 * @interface ICleanConfigure
 * @extends {ActivityConfigure}
 */
export interface CleanConfigure extends BuildHandleConfigure {
    /**
     * clean match.
     *
     * @type {ExpressionType<Src>}
     * @memberof ICleanConfigure
     */
    clean: ExpressionType<Src>;
}


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
            await ctx.del(clean);
        }
    }
}
