import { Task, Input, Expression, Activity, Src, TemplateOption } from '@tsdi/activities';
import { Inject } from '@tsdi/ioc';
import { NodeActivityContext } from '../core';
import { runTest, UnitTestConfigure } from '@tsdi/unit';



/**
 * unit test activity template option.
 *
 * @export
 * @interface SourceActivityOption
 * @extends {TemplateOption}
 */
export interface UnitTestActivityOption extends TemplateOption {
    /**
     * test source.
     *
     * @type {Expression<Src>}
     * @memberof UnitTestActivityOption
     */
    test: Expression<Src>;

    /**
     * src option
     *
     * @type {Expression<DestOptions>}
     * @memberof UnitTestActivityOption
     */
    testOptions?: Expression<UnitTestConfigure>;
}


@Task('test, [test]')
export class UnitTestActivity extends Activity<void> {

    @Input()
    test: Expression<Src>;

    @Input('testOptions')
    options: Expression<UnitTestConfigure>;


    constructor(@Inject('[test]') test: Expression<Src>) {
        super()
        this.test = test;
    }

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let test = await this.resolveExpression(this.test, ctx);
        let options = await this.resolveExpression(this.options, ctx);
        if (test) {
            await runTest(test, options);
        }
    }
}

