import { dest, DestOptions } from 'vinyl-fs';
import { Expression, ExpressionType, Task } from '@taskfr/core';
import { StreamActivity } from './StreamActivity';
import { ITransformConfigure } from './ITransformConfigure';
import { DestConfigure, IDestCompiler } from '../../core';


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

    getDest(): Promise<string> {
        return this.reolverExpression(this.dest);
    }

    protected async execute(): Promise<void> {
        let dist = await this.getDest();
        let destOptions = undefined;
        if (this.destOptions) {
            destOptions = await this.context.exec(this, this.destOptions);
        }
        dist = this.context.toRootPath(dist);
        this.context.result = await this.executePipe(this.context.result, dest(dist, destOptions), true);
    }
}
