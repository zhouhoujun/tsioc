import { CtxType, ExpressionType, Expression, Task, InjectAcitityToken, IActivity, Src } from '@ts-ioc/activities';
import { isUndefined } from '@ts-ioc/core';
import { BuildHandleActivity, BuildHandleContext } from '../BuildHandleActivity';
import { BuildHandleConfigure } from '../BuildHandle';

/**
 * Serve activity configure.
 *
 * @export
 * @interface ServeConfigure
 * @extends {SourceConfigure}
 */
export interface ServeConfigure extends BuildHandleConfigure {

    /**
     * Serve source.
     *
     * @type {TransformSource}
     * @memberof ITransformConfigure
     */
    src: ExpressionType<Src>;

    /**
     * server start port.
     *
     * @type {ExpressionType<boolean>}
     * @memberof ServeConfigure
     */
    port?: ExpressionType<number>;

    /**
     * Serve options.
     *
     * @type {CtxType<any>}
     * @memberof ServeConfigure
     */
    options?: CtxType<any>;
}

/**
 * Serve activity token.
 */
export const ServeToken = new InjectAcitityToken<IActivity>('Serve');

/**
 * Serve activity.
 *
 * @export
 * @class ServeActivity
 * @extends {SourceActivity}
 */
@Task(ServeToken)
export class ServeActivity extends BuildHandleActivity {

    /**
     * Serve src files
     *
     * @type {Expression<Src>}
     * @memberof ServeActivity
     */
    src: Expression<Src>;
    /**
     * Serve options.
     *
     * @type {*}
     * @memberof IPipeServe
     */
    options: any;
    /**
     * eanble Serve or not.
     *
     * @type {Expression<number>}
     * @memberof ServeActivity
     */
    port: Expression<number>;

    async onActivityInit(config: ServeConfigure) {
        await super.onActivityInit(config);
        this.options = this.context.to(config.options);
        if (!isUndefined(config.port)) {
            this.port = await this.toExpression(config.port);
        }
        if (!isUndefined(config.src)) {
            this.src = await this.toExpression(config.src);
        }
    }

    protected async compile(ctx: BuildHandleContext<any>): Promise<void> {
        await this.execActivity(this.compiler, ctx);
    }
}
