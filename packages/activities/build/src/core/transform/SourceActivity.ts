import { src, SrcOptions } from 'vinyl-fs';
import { Src, Expression, ExpressionType, Task, InjectAcitityToken, ActivityConfigure } from '@taskfr/core';
import { StreamActivity } from './StreamActivity';

/**
 * source activity token.
 */
export const SourceAcitvityToken = new InjectAcitityToken<SourceActivity>('source');

/**
 * source pipe configure.
 *
 * @export
 * @interface ITransformSourceConfigure
 * @extends {ITransformConfigure}
 */
export interface SourceConfigure extends ActivityConfigure {
    /**
     * transform source.
     *
     * @type {TransformSource}
     * @memberof ITransformConfigure
     */
    src: ExpressionType<Src>;

    /**
     * src options.
     *
     * @type {CtxType<SrcOptions>}
     * @memberof ITransformConfigure
     */
    srcOptions?: ExpressionType<SrcOptions>;
}

/**
 * Source activity.
 *
 * @export
 * @class SourceActivity
 * @extends {TransformActivity}
 */
@Task(SourceAcitvityToken)
export class SourceActivity extends StreamActivity {
    /**
     * source
     *
     * @type {TransformSource}
     * @memberof ITransformSource
     */
    src: Expression<Src>;

    /**
     * source options.
     *
     * @type {SrcOptions}
     * @memberof TransformSource
     */
    srcOptions: Expression<SrcOptions>;

    async onActivityInit(config: SourceConfigure) {
        await super.onActivityInit(config);
        this.src = await this.toExpression(config.src);

        if (config.srcOptions) {
            this.srcOptions = await this.toExpression(config.srcOptions)
        }
    }

    protected async execute() {
        let ctx = this.getContext();
        if (this.src) {
            let strSrc = await ctx.exec(this, this.src);
            let options = await ctx.exec(this, this.srcOptions);
            ctx.setAsResult(src(strSrc, options || undefined));
        }
    }
}
