import { CtxType, ExpressionType, Expression, Task, InjectAcitityToken, IActivity, Active, Src } from '@taskfr/core';
import { isUndefined } from '@ts-ioc/core';
import { BuildHandleActivity, BuildHandleConfigure } from '../BuildHandleActivity';
import { BuildHandleContext } from '../BuildHandleContext';

/**
 * test activity configure.
 *
 * @export
 * @interface TestConfigure
 * @extends {SourceConfigure}
 */
export interface TestConfigure extends BuildHandleConfigure {

    /**
     * test source.
     *
     * @type {TransformSource}
     * @memberof ITransformConfigure
     */
    src: ExpressionType<Src>;

    /**
     * set match test file source.
     *
     * @type {ExpressionType<boolean>}
     * @memberof TestConfigure
     */
    enable?: ExpressionType<boolean>;

    /**
     * test framework.
     *
     * @type {Active}
     * @memberof TestConfigure
     */
    framework?: Active;
    /**
     * test options.
     *
     * @type {CtxType<any>}
     * @memberof TestConfigure
     */
    options?: CtxType<any>;
}

/**
 * test activity token.
 */
export const TestToken = new InjectAcitityToken<IActivity>('test');

/**
 * test activity.
 *
 * @export
 * @class TestActivity
 * @extends {SourceActivity}
 */
@Task(TestToken)
export class TestActivity extends BuildHandleActivity {

    /**
     * test src files
     *
     * @type {Expression<Src>}
     * @memberof TestActivity
     */
    src: Expression<Src>;
    /**
     * test options.
     *
     * @type {*}
     * @memberof IPipeTest
     */
    options: any;

    /**
     * eanble test or not.
     *
     * @type {Expression<boolean>}
     * @memberof TestActivity
     */
    enable: Expression<boolean>;

    async onActivityInit(config: TestConfigure) {
        await super.onActivityInit(config);
        this.options = this.getContext().to(config.options);
        if (!isUndefined(config.enable)) {
            this.enable = await this.toExpression(config.enable);
        }
        if (!isUndefined(config.src)) {
            this.src = await this.toExpression(config.src);
        }
    }

    protected async compile(ctx: BuildHandleContext<any>): Promise<void> {
        let test = await ctx.exec(this, this.enable);
        let testSrc = await ctx.exec(this, this.src);
        if (testSrc) {
            ctx = this.createContext(testSrc);
        }
        if (test !== false && this.compiler) {
            await this.compiler.run(ctx);
        }
    }
}
