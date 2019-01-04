import { dest, DestOptions } from 'vinyl-fs';
import { ExpressionType, Task } from '@taskfr/core';
import { StreamActivity } from './StreamActivity';
import { ITransformConfigure } from './ITransformConfigure';
import { DestConfigure, IDestCompiler } from '../../core';
import { lang } from '@ts-ioc/core';


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
@Task
export class DestActivity extends StreamActivity implements IDestCompiler {

    protected async execute(): Promise<void> {
        let config = this.context.config as StreamDestConfigure;
        let dist = await this.resolveExpression(this.context.getDist());
        let destOptions = undefined;
        if (config.destOptions) {
            destOptions = await this.resolveExpression(config.destOptions);
        }
        dist = this.context.toRootPath(dist);
        let restult = await this.executePipe(this.context.result, dest(dist, destOptions), true);
        this.context.result = restult;
    }
}
