import { Input, Binding } from '@tsdi/components';
import { Task, Activity, Src, TemplateOption } from '@tsdi/activities';
import { runTest, UnitTestConfigure } from '@tsdi/unit';
import { ConsoleReporter } from '@tsdi/unit-console';
import { NodeActivityContext, NodeExpression } from '../core';


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
export class UnitTestActivity extends Activity<void> {

    @Input() test: NodeExpression<Src>;
    @Input('testOptions') options: NodeExpression<UnitTestConfigure>;

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let test = await this.resolveExpression(this.test, ctx);
        let options = await this.resolveExpression(this.options, ctx);
        if (test) {
            await runTest(test, Object.assign({ baseURL: ctx.platform.getRootPath() }, options || {}), ConsoleReporter);
        }
    }
}

