import { Input, Binding } from '@tsdi/components';
import { Task, Src, TemplateOption } from '@tsdi/activities';
import { runTest, UnitTestConfigure } from '@tsdi/unit';
import { ConsoleReporter } from '@tsdi/unit-console';
import { NodeActivityContext, NodeExpression } from '../NodeActivityContext';
import { NodeActivity } from '../NodeActivity';


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
     * @type {NodeExpression<Src>}
     * @memberof UnitTestActivityOption
     */
    test: Binding<NodeExpression<Src>>;

    /**
     * src option
     *
     * @type {NodeExpression<DestOptions>}
     * @memberof UnitTestActivityOption
     */
    testOptions?: Binding<NodeExpression<UnitTestConfigure>>;
}


@Task('test, [test]')
export class UnitTestActivity extends NodeActivity<void> {

    @Input() test: NodeExpression<Src>;
    @Input('testOptions') options: NodeExpression<UnitTestConfigure>;

    async execute(ctx: NodeActivityContext): Promise<void> {
        let test = await ctx.resolveExpression(this.test);
        let options = await ctx.resolveExpression(this.options);
        if (test) {
            await runTest(test, { baseURL: ctx.platform.getRootPath(), ...options }, ConsoleReporter);
        }
    }
}

