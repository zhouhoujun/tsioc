import * as uglify from 'gulp-uglify';
import { Task, OnActivityInit } from '@taskfr/core';
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
    uglifyOptions: any;

    async onActivityInit(config: StreamUglifyConfigure) {
        await super.onActivityInit(config);
        this.uglifyOptions = this.context.to(config.uglifyOptions);
    }

    protected async execute(): Promise<void> {
        let hd = this.context.handle;
        this.context.result = await this.executePipe(this.context.result, this.uglifyOptions ? uglify(this.uglifyOptions) : uglify());
    }
}
