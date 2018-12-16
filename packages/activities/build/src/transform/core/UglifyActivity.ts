
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
@Refs(UglifyToken, CompilerToken)
@Task
export class UglifyCompilerActivity extends StreamActivity implements OnActivityInit {

    protected async execute(): Promise<void> {
        let hd = this.context.handle as UglifyActivity;
        let uglifyOptions = hd.uglifyOptions;
        this.context.result = await this.executePipe(this.context.result, uglifyOptions ? uglify(uglifyOptions) : uglify());
    }
}
