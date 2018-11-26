
import * as uglify from 'gulp-uglify';
import { Task, OnActivityInit, ActivityConfigure, CtxType, InjectAcitityToken, ExpressionToken, ConfigureType } from '@taskfr/core';
import { NodeActivity } from '@taskfr/node';

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
export class UglifyActivity extends NodeActivity implements OnActivityInit {

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
        if (this.uglifyOptions) {
            ctx.result = ctx.result.pipe(uglify(this.uglifyOptions))
        } else {
            ctx.result = ctx.result.pipe(uglify())
        }
    }
}
