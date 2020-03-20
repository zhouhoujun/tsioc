import { Input, Binding } from '@tsdi/components';
import { Task, Src, TemplateOption } from '@tsdi/activities';
import { runTest, UnitTestConfigure } from '@tsdi/unit';
import { ConsoleReporter } from '@tsdi/unit-console';
import { NodeActivityContext } from '../NodeActivityContext';
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
     * @type {Src}
     * @memberof UnitTestActivityOption
     */
    test: Binding<Src>;

    /**
     * src option
     *
     * @type {DestOptions}
     * @memberof UnitTestActivityOption
     */
    testOptions?: Binding<UnitTestConfigure>;
}


@Task('test, [test]')
export class UnitTestActivity extends NodeActivity<void> {

    @Input() test: Src;
    @Input('testOptions') options: UnitTestConfigure;

    async execute(ctx: NodeActivityContext): Promise<void> {
        let test = this.test;
        let options = this.options;
        if (test) {
            await runTest(test, Object.assign({ baseURL: ctx.platform.getRootPath() }, options || {}), ConsoleReporter);
        }
    }
}

