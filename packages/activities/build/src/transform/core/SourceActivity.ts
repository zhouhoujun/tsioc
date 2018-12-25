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
     * soucre config.
     *
     * @type {StreamSourceConfigure}
     * @memberof SourceActivity
     */
    config: StreamSourceConfigure;


    protected async execute(): Promise<void> {
        let config = this.config || this.context.config;
        if (config.src) {
            let strSrc = await this.resolveExpression(config.src);
            let options;
            if (config.srcOptions) {
                options = await this.resolveExpression(config.srcOptions);
            }
            this.context.result = src(strSrc, options || undefined);
        }
    }
}
