import { Task } from '@ts-ioc/activities';
import { Refs } from '@ts-ioc/core';
import { StreamActivity } from './StreamActivity';
import { TestToken, CompilerToken, TestConfigure } from '../../core';

/**
 * test activity.
 *
 * @export
 * @class TestActivity
 * @extends {SourceActivity}
 */
@Task
@Refs(TestToken, CompilerToken)
export class MochaTestActivity extends StreamActivity {
    protected async execute(): Promise<void> {
        let ta = this.context.parent.config as TestConfigure;
        await this.executePipe(this.context.result, () => {
            let mocha = require('gulp-mocha');
            return ta.options ? mocha(ta.options) : mocha();
        }, true);
    }
}
