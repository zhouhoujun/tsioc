import { CtxType, ExpressionType, Expression, Task, InjectAcitityToken, ActivityConfigure, IActivity, Active, Src } from '@taskfr/core';
import { isUndefined, lang } from '@ts-ioc/core';
import { NodeActivity } from '@taskfr/node';

/**
 * test activity configure.
 *
 * @export
 * @interface TestConfigure
 * @extends {SourceConfigure}
 */
export interface TestConfigure extends ActivityConfigure {

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
 * test framework token.
 */
export const TestFrameworkToken = new InjectAcitityToken<IActivity>('test-framework');

/**
 * test activity.
 *
 * @export
 * @class TestActivity
 * @extends {SourceActivity}
 */
@Task(TestToken)
export class TestActivity extends NodeActivity {

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

    /**
     * test framework.
     *
     * @type {Expression<boolean>}
     * @memberof TestActivity
     */
    framework: IActivity;

    async onActivityInit(config: TestConfigure) {
        await super.onActivityInit(config);
        this.options = this.getContext().to(config.options);
        if (!isUndefined(config.enable)) {
            this.enable = await this.toExpression(config.enable);
        }
        if (config.framework) {
            this.framework = await this.buildActivity(config.framework);
        } else {
            this.framework = this.getContainer().getService(TestFrameworkToken, lang.getClass(this))
        }
    }

    protected async execute(): Promise<void> {
        let ctx = this.getContext();
        let test = await ctx.exec(this, this.enable);
        ctx.setAsResult(await ctx.exec(this, this.src))
        if (test !== false && this.framework) {
            ctx.target = this;
            await this.framework.run(ctx);
        }
    }
}
