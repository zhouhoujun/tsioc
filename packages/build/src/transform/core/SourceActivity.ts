import { src, SrcOptions } from 'vinyl-fs';
import { ExpressionType, Task } from '@ts-ioc/activities';
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

    protected async execute(): Promise<void> {
        let strSrc = await this.resolveExpression(this.context.getSrc());
        let config = this.context.config as StreamSourceConfigure;
        if (strSrc) {
            let options;
            if (config.srcOptions) {
                options = await this.resolveExpression(config.srcOptions);
            }
            this.context.result = src(this.context.toRootSrc(strSrc), options || undefined);
        }
    }
}
