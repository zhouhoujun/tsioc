import { Src, InjectAcitityToken, Task, ActivityConfigure, Expression, ExpressionType } from '@taskfr/core';
import { NodeActivity } from '@taskfr/node';



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
export interface CleanConfigure extends ActivityConfigure {
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
export class CleanActivity extends NodeActivity {

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
     * @param {*} [data]
     * @returns {Promise<any>}
     * @memberof CleanActivity
     */
    protected async execute(): Promise<void> {
        let ctx = this.getContext();
        let clean = await ctx.exec(this, this.clean);
        await ctx.del(clean);
    }
}
