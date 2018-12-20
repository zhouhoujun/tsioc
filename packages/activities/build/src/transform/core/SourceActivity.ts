import { src, SrcOptions } from 'vinyl-fs';
import { Src, Expression, ExpressionType, Task } from '@taskfr/core';
import { StreamActivity } from './StreamActivity';
import { ITransformConfigure } from './ITransformConfigure';
import { SourceConfigure, ISourceCompiler } from '../../core';

/**
 * source pipe configure.
 *
 * @export
 * @interface ITransformSourceConfigure
 * @extends {ITransformConfigure}
 */
export interface StreamSourceConfigure extends ITransformConfigure, SourceConfigure {

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
@Task
export class SourceActivity extends StreamActivity implements ISourceCompiler {

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

    async onActivityInit(config: StreamSourceConfigure) {
        await super.onActivityInit(config);
        this.src = await this.toExpression(config.src);

        if (config.srcOptions) {
            this.srcOptions = await this.toExpression(config.srcOptions)
        }
    }

    getSource(): Promise<Src> {
        return this.reolverExpression(this.src);
    }

    protected async execute(): Promise<void> {
        if (this.src) {
            let strSrc = await this.getSource();
            let options = await this.context.exec(this, this.srcOptions);
            this.context.result = src(strSrc, options || undefined);
        }
    }
}
