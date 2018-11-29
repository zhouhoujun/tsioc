import { Task } from '@taskfr/core';
import { Refs } from '@ts-ioc/core';
import { StreamActivity } from './StreamActivity';
import { TestToken, TestActivity, CompilerToken } from '../../core';

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
        let ta = this.context.handle as TestActivity;
        await this.executePipe(this.context.result, () => {
            let mocha = require('gulp-mocha');
            return ta.options ? mocha(ta.options) : mocha();
        }, true);
    }
}
