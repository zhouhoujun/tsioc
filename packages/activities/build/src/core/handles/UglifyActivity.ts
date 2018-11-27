import { Task, OnActivityInit, CtxType, InjectAcitityToken } from '@taskfr/core';
import { BuildHandleConfigure, BuildHandleActivity } from '../BuildHandleActivity';
import { BuildHandleContext } from '../BuildHandleContext';

/**
 * uglify activity configure.
 *
 * @export
 * @interface UglifyConfigure
 * @extends {ActivityConfigure}
 */
export interface UglifyConfigure extends BuildHandleConfigure {

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
export class UglifyActivity extends BuildHandleActivity implements OnActivityInit {

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

    protected async compile(ctx: BuildHandleContext<any>): Promise<void> {
        await this.compiler.run(ctx);
    }
}
