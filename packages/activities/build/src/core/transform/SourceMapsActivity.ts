import { CtxType, ActivityConfigure, InjectAcitityToken, IActivityResult, Task } from '@taskfr/core';
import { ITransform } from './ITransform';
import { TransformContext } from './StreamActivity';
import { StreamActivity } from './StreamActivity';


/**
 * source map configure
 *
 * @export
 * @interface SourceMapsConfigure
 * @extends {ActivityConfigure}
 */
export interface SourceMapsConfigure extends ActivityConfigure {
    /**
     * sourcemaps.
     */
    sourcemaps?: CtxType<string>;
}

/**
 * source map activity.
 *
 * @export
 * @interface ISourceMapsActivity
 * @extends {IActivityResult<ITransform>}
 */
export interface ISourceMapsActivity extends IActivityResult<ITransform> {
    sourcemaps: string;
}

/**
 * source maps token.
 */
export const SourceMapsToken = new InjectAcitityToken<ISourceMapsActivity>('sourcemaps');



/**
 * source maps token.
 *
 * @export
 * @class SourceMapsActivity
 * @extends {Activity<ITransform>}
 * @implements {OnActivityInit}
 */
@Task(SourceMapsToken)
export class SourceMapsActivity extends StreamActivity implements ISourceMapsActivity {
    sourcemaps: string;

    private hasInit = false;

    async onActivityInit(config: SourceMapsConfigure) {
        await super.onActivityInit(config);
        this.sourcemaps = this.getContext().to(config.sourcemaps) || './sourcemaps';
    }

    protected async execute() {
        const sourcemaps = require('gulp-sourcemaps');
        if (!sourcemaps) {
            console.error('not found gulp-sourcemaps');
            return;
        }
        let ctx = this.getContext();
        ctx.result = await this.executePipe(ctx.result, this.hasInit ? () => sourcemaps.write(this.sourcemaps) : () => sourcemaps.init());
    }

    async init(ctx: TransformContext) {
        this.hasInit = false;
        await this.run(ctx);
        this.hasInit = true;
    }

    async write(ctx: TransformContext) {
        if (!this.hasInit) {
            return;
        }
        await this.run(ctx);
    }
}
