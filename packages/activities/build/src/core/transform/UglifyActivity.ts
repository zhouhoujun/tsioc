
import * as uglify from 'gulp-uglify';
import { Task, OnActivityInit, ActivityConfigure, CtxType, InjectAcitityToken, ExpressionToken, ConfigureType } from '@taskfr/core';
import { StreamActivity } from './StreamActivity';

/**
 * uglify activity configure.
 *
 * @export
 * @interface UglifyConfigure
 * @extends {ActivityConfigure}
 */
export interface UglifyConfigure extends ActivityConfigure {

    /**
     * uglify options.
     *
     * @type {CtxType<any>}
     * @memberof UglifyConfigure
     */
    uglifyOptions?: CtxType<any>;
}

/**
 *  uglify token.
 */
export const UglifyToken = new InjectAcitityToken<UglifyActivity>('uglify');


/**
 * uglify activity.
 *
 * @export
 * @class UglifyActivity
 * @extends {Activity<ITransform>}
 * @implements {OnActivityInit}
 */
@Task(UglifyToken)
export class UglifyActivity extends StreamActivity implements OnActivityInit {

    /**
     * uglify options
     *
     * @type {*}
     * @memberof UglifyActivity
     */
    uglifyOptions: any;

    async onActivityInit(config: UglifyConfigure) {
        await super.onActivityInit(config);
        this.uglifyOptions = this.getContext().to(config.uglifyOptions);
    }

    protected async execute() {
        let ctx = this.getContext();
        ctx.result = await this.executePipe(ctx.result, this.uglifyOptions ? uglify(this.uglifyOptions) : uglify());
    }
}
