import { CtxType, ExpressionType, Expression, Task, InjectAcitityToken, IActivity, Active, Src } from '@taskfr/core';
import { isUndefined } from '@ts-ioc/core';
import { BuildHandleActivity, BuildHandleConfigure, BuildHandleContext } from '../BuildHandleActivity';

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
        if (this.compiler) {
            await this.compiler.run(ctx);
        }
    }
}
