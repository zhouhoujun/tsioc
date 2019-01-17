import { UnitTest } from '@ts-ioc/unit';
import { ConsoleReporter } from '@ts-ioc/unit-console';
import { TestConfigure } from './ITestActivity';
import { CompilerActivity } from '../CompilerActivity';
import { Task } from '@ts-ioc/activities';

/**
 * test activity.
 *
 * @export
 * @class TestActivity
 * @extends {SourceActivity}
 */
@Task
export class UnitTestActivity extends CompilerActivity {
    protected async execute(): Promise<void> {
        let ta = this.context.parent.config as TestConfigure;
        await UnitTest.create(ta.options)
            .use(ConsoleReporter)
            .test(this.context.result);
    }
}
