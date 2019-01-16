import { UnitTest } from '@ts-ioc/unit';
import { ConsoleReporter } from '@ts-ioc/unit-console';
import { TestConfigure, TestToken, CompilerToken } from '../../core';
import { CompilerActivity } from '../CompilerActivity';
import { Task } from '@ts-ioc/activities';
import { Refs } from '@ts-ioc/core';

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
