import { dest, DestOptions } from 'vinyl-fs';
import { Expression, ExpressionType, Task, InjectAcitityToken } from '@taskfr/core';
import { SourceMapsActivity } from './SourceMapsActivity';
import { TransformContext } from './StreamActivity';
import { TransformActivity } from './TransformActivity';
import { ITransformConfigure } from './ITransformConfigure';
import { DestConfigure } from '../../core';


/**
 * dest activity token.
 */
export const DestAcitvityToken = new InjectAcitityToken<DestActivity>('dest');

/**
 * dest pipe configure.
 *
 * @export
 * @interface ITransformDestConfigure
 * @extends {ITransformConfigure}
 */
export interface StreamDestConfigure extends ITransformConfigure, DestConfigure {

    /**
     * dest options.
     *
     * @type {ExpressionType<DestOptions>}
     * @memberof ITransformConfigure
     */
    destOptions?: ExpressionType<DestOptions>;

}

/**
 * pipe dest activity.
 *
 * @export
 * @class DestActivity
 * @extends {TransformActivity}
 * @implements {ITransformDest}
 * @implements {OnTaskInit}
 */
@Task(DestAcitvityToken)
export class DestActivity extends TransformActivity {
    /**
     * source
     *
     * @type {Expression<string>}
     * @memberof ITransformDest
     */
    dest: Expression<string>;

    /**
     * source options.
     *
     * @type {Expression<DestOptions>}
     * @memberof TransformDest
     */
    destOptions: Expression<DestOptions>;

    async onActivityInit(config: StreamDestConfigure) {
        await super.onActivityInit(config);
        this.dest = await this.toExpression(config.dest);

        if (config.destOptions) {
            this.destOptions = await this.toExpression(config.destOptions);
        }
    }

    protected async afterPipe(): Promise<void> {
        await super.afterPipe();
        if (this.context.sourceMaps instanceof SourceMapsActivity) {
            await this.execActivity(this.context.sourceMaps, this.context);
        }
        await this.writeStream(this.context);
    }

    /**
     * write dest stream.
     *
     * @protected
     * @param {TransformContext} ctx
     * @returns {Promise<ITransform>}
     * @memberof DestActivity
     */
    protected async writeStream(ctx: TransformContext): Promise<void> {
        let dist = await ctx.exec(this, this.dest);
        let destOptions = undefined;
        if (this.destOptions) {
            destOptions = await ctx.exec(this, this.destOptions);
        }
        dist = ctx.toRootPath(dist);
        ctx.result = await this.executePipe(ctx.result, dest(dist, destOptions), true);
    }
}
