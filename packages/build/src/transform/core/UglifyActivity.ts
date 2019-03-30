import * as uglify from 'gulp-uglify';
import { Task, OnActivityInit } from '@tsdi/activities';
import { StreamActivity } from './StreamActivity';
import { ITransformConfigure } from './ITransformConfigure';
import { UglifyConfigure } from '../../core';

export interface StreamUglifyConfigure extends ITransformConfigure, UglifyConfigure {


}

/**
 * uglify activity.
 *
 * @export
 * @class UglifyActivity
 * @extends {Activity<ITransform>}
 * @implements {OnActivityInit}
 */
@Task
export class StreamUglifyActivity extends StreamActivity implements OnActivityInit {

    protected async execute(): Promise<void> {
        let config = this.context.config as StreamUglifyConfigure;
        let uglifyOptions = await this.context.to(config.uglifyOptions);
        this.context.result = await this.executePipe(this.context.result, uglifyOptions ? uglify(uglifyOptions) : uglify());
    }
}
