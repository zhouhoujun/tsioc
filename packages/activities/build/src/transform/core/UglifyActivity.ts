
import * as uglify from 'gulp-uglify';
import { Task, OnActivityInit } from '@taskfr/core';
import { StreamActivity } from './StreamActivity';
import { Refs } from '@ts-ioc/core';
import { CompilerToken, UglifyToken, UglifyActivity } from '../../core';


/**
 * uglify activity.
 *
 * @export
 * @class UglifyActivity
 * @extends {Activity<ITransform>}
 * @implements {OnActivityInit}
 */
@Task
@Refs(UglifyToken, CompilerToken)
export class UglifyCompilerActivity extends StreamActivity implements OnActivityInit {

    protected async execute() {
        let ctx = this.getContext();
        let hd = ctx.handle as UglifyActivity;
        let uglifyOptions = hd.uglifyOptions;
        ctx.result = await this.executePipe(ctx.result, uglifyOptions ? uglify(uglifyOptions) : uglify());
    }
}
