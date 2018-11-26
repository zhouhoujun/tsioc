
import { Task } from '@taskfr/core';
import { RefTo } from '@ts-ioc/core';
import { StreamActivity } from './StreamActivity';
import { TestFrameworkToken, TestToken, TestActivity } from '../activities';

/**
 * test activity.
 *
 * @export
 * @class TestActivity
 * @extends {SourceActivity}
 */
@Task(TestFrameworkToken)
@RefTo(TestToken)
export class StreamTestActivity extends StreamActivity {

    protected async execute(): Promise<void> {
        let ctx = this.getContext();
        let ta = ctx.target as TestActivity;
        await this.executePipe(ctx.result, () => {
            let mocha = require('gulp-mocha');
            return ta.options ? mocha(ta.options) : mocha();
        }, true);

    }
}
