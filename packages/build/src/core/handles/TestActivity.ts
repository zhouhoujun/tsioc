import { Expression, Task, Src } from '@ts-ioc/activities';
import { isUndefined, Providers } from '@ts-ioc/core';
import { BuildHandleActivity, BuildHandleContext } from '../BuildHandleActivity';
import { TestToken, ITestActivity, TestConfigure } from './ITestActivity';
import { UnitTestActivity } from './UnitTestActivity';
import { CompilerToken } from '../ICompiler';


/**
 * test activity.
 *
 * @export
 * @class TestActivity
 * @extends {SourceActivity}
 */
@Task(TestToken)
@Providers([
    { provide: CompilerToken, useClass: UnitTestActivity }
])
export class TestActivity extends BuildHandleActivity implements ITestActivity {

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
        // if (!config.compiler) {
        //     config.compiler = UnitTestActivity;
        // }
        await super.onActivityInit(config);
        this.options = this.context.to(config.options);
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
            ctx.setAsResult(ctx.toRootSrc(testSrc));
        }
        if (test !== false) {
            await this.execActivity(this.compiler, ctx);
        }
    }
}
