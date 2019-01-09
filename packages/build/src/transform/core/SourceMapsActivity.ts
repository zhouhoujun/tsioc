import { IActivityResult, Task } from '@ts-ioc/activities';
import { ITransform } from './ITransform';
import { TransformContext } from './StreamActivity';
import { StreamActivity } from './StreamActivity';
import { SourceMapsConfigure } from '../../core';
import { isBoolean } from '@ts-ioc/core';


/**
 * source map activity.
 *
 * @export
 * @interface ISourceMapsActivity
 * @extends {IActivityResult<ITransform>}
 */
export interface ISourceMapsActivity extends IActivityResult<ITransform> {
    config: SourceMapsConfigure;
}


/**
 * source maps token.
 *
 * @export
 * @class SourceMapsActivity
 * @extends {Activity<ITransform>}
 * @implements {OnActivityInit}
 */
@Task
export class SourceMapsActivity extends StreamActivity implements ISourceMapsActivity {

    config: SourceMapsConfigure;

    private hasInit = false;

    protected async execute() {
        let config = this.config || this.context.config;
        const sourcemaps = require('gulp-sourcemaps');
        if (!sourcemaps) {
            console.error('not found gulp-sourcemaps');
            return;
        }
        let dist = this.context.to(config.sourcemaps);
        if (!dist || isBoolean(dist)) {
            dist = './sourcemaps';
        }
        this.context.result = await this.executePipe(this.context.result, this.hasInit ? () => sourcemaps.write(dist) : () => sourcemaps.init());
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
